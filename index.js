const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.du8ey.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorize' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db('manufac_server_assign12').collection('myservice');
        const bookingCollection = client.db('manufac_server_assign12').collection('bookings');
        const userCollection = client.db('manufac_server_assign12').collection('users');
        const productCollection = client.db('manufac_server_assign12').collection('products');

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'Forbidden' });
            }
        }
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });
        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })
        app.put('/user/admin/:email', verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'Forbidden' });
            }
        })
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET)
            res.send({ result, AccessToken: token });
            console.log(token, process.env.ACCESS_TOKEN_SECRET)
        });
        app.delete('/user/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await userCollection.deleteOne(filter);
            res.send(result)
        })
        app.get('/booking', verifyJWT, async (req, res) => {
            const query = {};
            const authorization = req.headers.authorization;
            console.log('auth header', authorization);
            const cursor = bookingCollection.find(query);
            const bookings = await cursor.toArray();
            res.send(bookings);

        });
        app.post('/product', verifyJWT, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        })
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = { purcesName: booking.purcesName, customerName: booking.customerName }
            const exixts = await bookingCollection.findOne(query);
            if (exixts) {
                return res.send({ success: false, booking: exixts })
            }
            const result = await bookingCollection.insertOne(booking);
            return res.send({ success: true, result });
        })

    }
    finally {

    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hi This is Sarfaraj Collections')
})

app.listen(port, () => {
    console.log(`Manufacture app listening on port ${port}`)
})