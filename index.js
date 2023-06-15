const express = require('express');
const app = express();
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nvffntx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        
        const userCollection = client.db("supportSystem").collection("users");
        const ticketCollection = client.db("supportSystem").collection("ticket");


		// create new user when sing up or sing in 
        app.post("/create_user", async (req, res) => {
			const userInfo = req.body;
            const query ={email: userInfo.email};
            const isExist = await userCollection.findOne(query);
            console.log(isExist)
            if (isExist) {
                return res.send({})
            }
            const storedUser = await userCollection.insertOne(userInfo);
            
            console.log(storedUser)
			res.send(storedUser);
		});
		


		// create ticket 
		app.post(`/create-ticket`, async (req, res) => {
			const ticket = req.body;

			// to make ticket nlumber
			let totalTicket = await ticketCollection.estimatedDocumentCount();
			if (totalTicket < 9) {
				totalTicket = `000${totalTicket+1}`
			} else if (totalTicket < 99) {
				totalTicket = `00${totalTicket + 1}`
			} else if (totalTicket < 999) {
				totalTicket = `0${totalTicket + 1}`
			}


			const ticketDate = new Date();
			let day = ticketDate.getDate();
			if (day < 10) {
				day = `0${day}`;
			}
			let month = ticketDate.getMonth() + 1;
			if (month < 10) {
				console.log("first");
				month = `0${month}`;
			}
			const year = ticketDate.getFullYear() % 100;


			const ticketInfo = {
				...ticket,
				ticketID: `NTPIDS${day}${month}${year}${totalTicket}`,
				status: 'open'
			};

			const result = await ticketCollection.insertOne(ticketInfo)
			

			res.send(result);
		});

		// get ticket 
		app.get('/get-all-ticket', async (req, res) => {
			const email = req.query.email;
			const query = { email: email };
			const tikets = await ticketCollection.find(query).toArray()

			res.send(tikets);
		})

		// get single ticket 
		app.get('/get-single-ticket/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const singleTicket = await ticketCollection.findOne(query)
			res.send(singleTicket)
		})

		// response ticket 
		app.put('/response-ticket', async (req, res) => {
			const id = req.query.id;
			const query = {_id: new ObjectId(id)}
			const responseData = req.body;
			// const updatedDoc = {
			// 	$
			// }

			console.log(query, responseData)
			const options = { upsert: true };
			const existTicket = await ticketCollection.updateOne(
				query,
				{
					$push: { description: responseData },
				},
				options
			);
			
			console.log(existTicket);
			res.send(existTicket);
		})




		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log(
			"Pinged your deployment. You successfully connected to MongoDB!"
		);
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Support Portal Server is running....')
})

app.listen(port, () => {
    console.log(`this server is running on ${port}`)
})