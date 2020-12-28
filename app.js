'use strict'

var express = require('express');
var bodyParser = require('body-parser');

var app = express();

// Cargar Rutas

// Middleware
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
// Cors

// Rutas

app.get('/' , (req, res) =>{
    res.status(200).send({
        message: 'Hola Mundo desde el Servidor NodeJs'
    })
})

app.get('/pruebas' , (req, res) =>{
    res.status(200).send({
        message: 'Accion de pruebas del Servidor NodeJs'
    })
})


module.exports = app;

