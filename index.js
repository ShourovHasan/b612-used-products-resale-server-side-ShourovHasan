const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { query } = require('express');
const port = process.env.PORT || 5000;
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const app = express();

// Middleware 
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.qwlqnnv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    // console.log('authorization in', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status.send({ message: 'forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}

const run = async () => { 
    try {
        const categoriesCollection = client.db("resaleMobileStore").collection("categories");
        const productsCollection = client.db("resaleMobileStore").collection("products");
        const usersCollection = client.db("resaleMobileStore").collection("users");

        // jwt
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '10d' });
                return res.send({ accessToken: token });
            }

            // console.log(user);
            res.status(403).send({ accessToken: '' })
        })

        // users 
        const verifyAdmin = async (req, res, next) => {
            // console.log('inside verify admin', req.decoded.email);
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user.userType !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }
        const verifySeller = async (req, res, next) => {
            // console.log('inside verify seller', req.decoded.email);
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user.userType !== 'seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = {
                email: user.email
            }
            const alreadyAddedUser = await usersCollection.find(query).toArray();
            if (alreadyAddedUser.length) {
                const message = `already you are our user. Don't need to create an account`;
                return res.send({ message })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        
        

    }
    finally {
        
    }
}
run().catch(console.dir)
app.get('/', async (req, res) => {
    res.send('Resale Mobile Store server is running');
})

app.listen(port, () => {
    console.log(`Resale Mobile Store is running on port ${port}`)
})