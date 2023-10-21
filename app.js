const express = require("express");
const bodyParser = require("body-parser");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require('graphql');
const bcrypt = require('bcryptjs')
const mongoose = require("mongoose");

const Event = require('./models/event')
const User = require('./models/user')

const app = express();

app.use(bodyParser.json());

app.use('/graphql', graphqlHTTP({
    schema: buildSchema(`
        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
            creator: User!
        }

        type User {
            _id: ID!
            email: String!
            password: String
            createdEvents: [Event!]
        }

        input UserInput {
            email: String!,
            password: String!
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        type RootQuery {
             events: [Event!]!
        }
        
        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }
        
        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
        events: () => {
            return Event.find().populate('creator').then(events => {
                console.log("events", events);
                return events.map(event => ({...event._doc}))
            }).catch(err => (console.log(err)));
        },
        createEvent: (args) => {
            const event = new Event({
                title: args.eventInput.title,
                description: args.eventInput.description,
                price: +args.eventInput.price,
                date: new Date().toISOString(),
                creator: '652c43d9bed42fe092b94244'
            })
            return event.save().then(async (res) => {
                const user = await User.findById('652c43d9bed42fe092b94244')
                if (user){
                    console.log("pushEvent", event);
                    user.createdEvents.push(event);
                    user.save()
                }
                console.log(res)
                return {...res._doc}
            }).catch(err=>{
                console.log(err)
                throw err
            });
        },
        createUser: async (args) => {
            const userExist = await User.findOne({email: args.userInput.email});
            if (userExist) {
                throw new Error('User alredy esixt');
            }
            const hashPassword = await bcrypt.hash(args.userInput.password, 12);
            console.log('hash', hashPassword);
            const user = new User({
                email: args.userInput.email,
                password: hashPassword
            });

            const res = await user.save()
            return {...res, password: null};
        }
    },
    graphiql: true
}))


mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.klnxrjm.mongodb.net/?retryWrites=true&w=majority`)
.then(()=>{
    app.listen(4444);
}).catch(err=>{
    console.log(err)
})
