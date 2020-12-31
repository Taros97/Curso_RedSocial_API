'user strict'

var mongoosePaginate = require('mongoose-pagination')
var fs = require('fs')
var path = require('path')

var User = require('../models/user')
var Follow = require('../models/follow')

function saveFollow(req, res){
    var params = req.body;


    var follow = new Follow()
    follow.user = req.user.sub;
    follow.followed = params.followed;

    follow.save((err, followStored)=>{
        if(err)
            return res.status(500).send({message: 'Error al guardar el follow'})
        if(!followStored)
            return res.status(404).send({message: 'El follow no se ha guardado'})

        return res.status(200).send({follow: followStored})
    })
}

function deleteFollow(req,res){
    var userId = req.user.sub;
    var followId = req.params.id;

    Follow.find({'user' : userId, 'followed': followId}).remove(err =>{
        if(err)
            return res.status(500).send({message: 'Error al borrar el follow'})
        return res.status(200).send({meesage: 'El follow se ha eliminado'})
    })

}

function getFollowingUser(req, res){
    var userId = req.user.sub;

    if(req.params.id && req.params.page)
        userId = req.params.id;

    var page = 1;
    if(req.params.page)
        page = req.params.page
    else
        page = req.params.id
    var itemsPerPage = 5;

    // Obtenemos los usuarios de la BD y los ordenamos por ID una vez obtenidos se paginan con Mongoose Pagination
    Follow.find({user:userId}).populate({path: 'followed'}).paginate(page,itemsPerPage, (err,follows,total) =>{

        if(err)
            return res.status(500).send({message: 'Error al Obtener los Follows'})

        if(!follows)
            return res.status(404).send({message: 'No estas siguiendo a ningun usuario'})

        return res.status(200).send({
            follows,
            total,
            pages: Math.ceil(total/itemsPerPage)
        })
    })
    
}

function getFollowedUsers(req,res){
    var userId = req.user.sub;

    if(req.params.id && req.params.page)
        userId = req.params.id;

    var page = 1;
    if(req.params.page)
        page = req.params.page
    else
        page = req.params.id

    var itemsPerPage = 5;

    // Obtenemos los usuarios de la BD y los ordenamos por ID una vez obtenidos se paginan con Mongoose Pagination
    Follow.find({followed:userId}).populate('user').paginate(page,itemsPerPage, (err,follows,total) =>{

        if(err)
            return res.status(500).send({message: 'Error al Obtener los Follows'})

        if(!follows)
            return res.status(404).send({message: 'No te sigue ningun usuario'})

        return res.status(200).send({
            follows,
            total,
            pages: Math.ceil(total/itemsPerPage)
        })
    })
}

function getMyFollows(req,res){
    var userId = req.user.sub;

    var find = Follow.find({user: userId})

    if(req.params.followed){
        find = Follow.find({followed: userId})
    }

    find.populate('user followed').exec((err,follows) =>{

        if(err)
            return res.status(500).send({message: 'Error al Obtener los Follows'})

        if(!follows)
            return res.status(404).send({message: 'No sigues ningun usuario'})

        return res.status(200).send({
            follows,
        })
    })
}

module.exports = {
    saveFollow,
    deleteFollow,
    getFollowingUser,
    getFollowedUsers,
    getMyFollows,
}