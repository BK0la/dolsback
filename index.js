import express from 'express'

const PORT = 7878;
const app = express()

app.get('/', (req, res) => {
    res.status(200).json('Server work')
})
app.listen(PORT, ()=>console.log('server started on port'+ PORT))