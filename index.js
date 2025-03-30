import express from 'express'
import mongoose from 'mongoose'
const PORT = 7878;
const DB_URL = 'mongodb+srv://admin:admindolsas@cluster0.09zilly.mongodb.net/'
const app = express()

app.get('/', (req, res) => {
    res.status(200).json('Server work')
})

async function startApp(){
    try{
        await mongoose.connect(DB_URL)
        app.listen(PORT, ()=>console.log('server started on port'+ PORT))
    } catch(e){
        console.log(e)
    }
}
    
startApp()