'use strict'

var mongoose = require('mongoose');
var app = require('./app')
var port = 3800;

mongoose.Promise = global.Promise;
// Algunas opciones han cambiado en MongoDB desde la fecha del video, se han usado 2 diferentes a la especificada en el video
mongoose.connect('mongodb://localhost:27017/curso_mean_social', { useUnifiedTopology: true , useNewUrlParser: true})
    .then(() => {
        console.log("La conexion a la base de datos curso_mean_social se ha realizado correctamente")

        app.listen(port, () =>{
            console.log("Servidor corriendo en http://localhost:" + port)
        })
    })
    .catch(err => console.log(err));