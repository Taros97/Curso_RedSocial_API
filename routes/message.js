'use strict'

var express = require('express')
var MessageController = require('../controllers/message');

var api = express.Router();
var md_auth = require('../middlewares/authenticated')

var multipart = require('connect-multiparty')
var md_upload = multipart({uploadDir: './uploads/publications'})

api.get('/prueba', md_auth.ensureAuth, MessageController.prueba);

module.exports = api;