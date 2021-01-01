'use strict'

var momwnt = require('moment');
var mongoosePaginate = require('mongoose-pagination');

var User = require('../models/user')
var Follow = require('../models/follow')
var Message = require('../models/message');
const { models } = require('mongoose');

function prueba(req, res){
    return status(200).send({message : 'Prueba de Message'})
}

module.exports = {
    prueba,
}