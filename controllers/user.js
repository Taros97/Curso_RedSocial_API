'user strict'

const { json } = require('body-parser')
var User = require('../models/user')
var Follow = require('../models/follow')
var Publication = require('../models/publication')
var bcrypt = require('bcrypt-nodejs')
var jwt = require('../services/jwt')
var mongoosePaginate = require('mongoose-pagination')
var fs = require('fs')
var path = require('path')
const { equal } = require('assert')

function home(req, res){
    res.status(200).send({
        message: 'Funcion Home'
    })
}

function pruebas(req, res){
    res.status(200).send({
        message: 'Funcion Pruebas'
    })
}

function saveUser(req, res){
    var user = new User();
    var params = req.body;

    // Comprobamos que el usuario pasado contiene los datos obligatorios
    if(params.name && params.surname && params.nick && 
        params.email && params.password){
            user.name = params.name;
            user.surname = params.surname;
            user.email = params.email;
            user.nick = params.nick;
            user.role = 'ROLE_USER';
            user.image = null;

            // Comprobamos que ese usuario no existe en la BD
            User.find({ $or: [ //Esto es una forma de comprobar varios campos (Equivalente a un || OR)
                {email:user.email.toLowerCase()},
                {nick : user.nick.toLowerCase()}
                ]}).exec((err, users) => {
                    if(err)
                        return res.status(500).send({message: 'Error al en la peticion de usuarios'});
                    if(users && users.length >= 1)
                        return res.status(200).send({message: 'El usuario que intentas registrar ya existe'})
                    else{
                        // Si no existe Hasheamos la contraseña
                        bcrypt.hash(params.password, null, null, (err, hash) => {
                            user.password = hash;
                            // Una vez hasheada procedemos a guardar el usuario en la BD
                            user.save((err, userStored) => {
                                if(err)
                                    return res.status(500).send({message: 'Error al guardar el usuario'});
                                if(userStored){
                                    res.status(200).send({user: userStored});
                                }else{
                                    res.status(404).send({message: 'No se ha registrado el usuario'})
                                }
                            })
                        });
                    }
                })
    }else{
        res.status(200).send({
            message: 'Envia todos los campos necesarios'
        })
    }
}

function loginUser(req, res){
    var params = req.body;
    var email = params.email;

    var email = params.email;
    var password = params.password;

    // Comprobamos que el usuario existe en la BD
    User.findOne({email: email}, (err, user) =>{
        if(err)
            return res.status(500).send({message:'Error en la peticion'})
        if(user){
            // Si existe comparamos la contraseña provista con la almacenada en la base de datos
            bcrypt.compare(password, user.password, (err, check) =>{
                if(check){

                    if(params.gettoken){
                        // Devolver Token
                        // Generar Token
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        })
                    }else{
                        // Devolver datos de usuario
                        user.password = undefined
                        res.status(200).send({user});
                    }
                }
                else
                    res.status(404).send({message: 'No se ha podido identificar el usuario'})
            })
        }
        else
            res.status(404).send({message: 'No se ha registrado el usuario'})
    })
}

// Conseguir Datos de un Usuairo
function  getUser(req,res){
    var userId = req.params.id;

    User.findById(userId, (err, user) => {
        if(err) return res.status(500).send({message: 'Error en la peticion'})

        if(!user) return res.status(404).send({message: 'El usuario no existe'})

        followThisUser(req.user.sub, userId).then((value) =>{
            user.password = undefined;
            return res.status(200).send({user,following : value.following, followed : value.followed})
        })

    })
}

async function followThisUser(identity_user_id,user_id){

    var following = await Follow.findOne({ "user": identity_user_id, "followed": user_id }).exec().then((follow) => {
        return follow;
    }).catch((err) => {
        return handleError(err);
    });

    var followed = await Follow.findOne({ "user": user_id, "followed": identity_user_id }).exec().then((follow) => {
        return follow;
    }).catch((err) => {
        return handleError(err);
    });

    return {
        following : following, 
        followed: followed
    }
}

// Obtener una lista de usuarios
function getUsers(req, res){
    var identity_user_id = req.user.sub;

    // Por defecto se carga la pagina 1 sino obtener la pagina de la peticion
    var page = 1;
    if(req.params.page)
        page = req.params.page;

    var itemsPerPage = 5;

    // Obtenemos los usuarios de la BD y los ordenamos por ID una vez obtenidos se paginan con Mongoose Pagination
    User.find().sort('_id').paginate(page,itemsPerPage, (err,users,total) =>{

        if(err)
            return res.status(500).send({message: 'Error al Obtener los Usuarios'})

        if(!users)
            return res.status(404).send({message: 'No hay usuario disponibles'})

        followuserIds(identity_user_id).then((value) =>{
            return res.status(200).send({
                users,
                users_following : value.following,
                users_follow_me : value.followed,
                total,
                pages: Math.ceil(total/itemsPerPage)
            })
        })


    })
}

async function followuserIds(user_id){

    
    var following = await Follow.find({ "user": user_id}).select({'_id' : 0, '_v' : 0, 'user':0}).exec().then((follows) => {

        var follows_clean = [];

        follows.forEach((follow) =>{
            follows_clean.push(follow.followed)
        });

        return follows_clean;
    }).catch((err) => {
        return err;
    });
    var followed = await Follow.find({"followed": user_id }).select({'_id' : 0, '_v' : 0, 'followed':0}).exec().then((follows) => {
        var follows_clean = [];

        follows.forEach((follow) =>{
            follows_clean.push(follow.user)
        });

        return follows_clean;
    }).catch((err) => {
        return err;
    });

    return {
        following : following, 
        followed: followed
    }
}

function getCounters(req, res){
    var user_id = req.user.sub;
    if(req.params.id)
        user_id = req.params.id;

    getCountFollow(user_id).then((value) =>{
        return res.status(200).send(value);
    })
}

async function getCountFollow(user_id){
    var following = await Follow.count({"user": user_id}).exec().then((count) => {
        return count;
    }).catch((err) => {
        return err;
    });

    var followed = await Follow.count({"followed": user_id}).exec().then((count) => {
        return count;
    }).catch((err) => {
        return err;
    });

    var publications = await Publication.count({"user": user_id}).exec().then((count) => {
        return count;
    }).catch((err) => {
        return err;
    });

    return {
        following : following, 
        followed: followed,
        publications: publications
    }
}

function updateUser(req,res){
    var userId = req.params.id;
    var update = req.body;
    delete update.password

    if(userId != req.user.sub)
        return res.status(500).send({message: 'No tienes permiso para actualizar los Datos del usuario'})
    
    // Actualizamos el usuario en la Bade de datos
    // Anotacion el tercer parametro es opcional, Indica que el callback devuela el usuario actualizado y no el antiguo
    User.findByIdAndUpdate(userId,update, {new : true ,useFindAndModify: false } , (err, userUpdated) =>{
        if(err)
            return res.status(500).send({message: 'Error en la Peticion'})
        if(!userUpdated)
            return res.status(404).send({message: 'No se ha podido actualizar el usuario'})

        return res.status(200).send({user:userUpdated})
    })
}

function uploadImage(req,res){
    var userId = req.params.id;


    if(req.files){
        var file_path = req.files.image.path;

        // Obtenemos el nombre del archivo
        var file_split = file_path.split('\\');
        var file_name = file_split[2];

        // Obtenemos la extension del archivo
        var ext_split = file_name.split('\.');
        var file_ext = ext_split[1]

        // Si no es el usuario
        if(userId != req.user.sub){
            return removeFilesOfUploads(res, file_path, 'No tienes permiso para actualizar los Datos del usuario');
        }

        if(file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif'){
            User.findByIdAndUpdate(userId, {image: file_name}, {new : true , useFindAndModify: false } , (err, userUpdated) =>{
                if(err)
                    return res.status(500).send({message: 'Error en la Peticion'})
                if(!userUpdated)
                    return res.status(404).send({message: 'No se ha podido actualizar el usuario'})
        
                return res.status(200).send({user:userUpdated})
            })
        }else{
            // Eliminamos el
            return removeFilesOfUploads(res, file_path, 'Extension no valida');
        }

    }else{
        return res.status(200).send({message: 'No se han subido imagenes'})
    }
}

function removeFilesOfUploads(res, file_path, message){
    fs.unlink(file_path, (err) =>{
        return res.status(200).send({message: message}) 
    })
}

function getImageFile(req,res){
    var image_file = req.params.imageFile;
    var path_file = './uploads/users/'+ image_file;

    fs.exists(path_file,(exists)=>{
        if(exists){
            res.sendFile(path.resolve(path_file))
        }else{
            return res.status(200).send({message: 'No existe la imagen'})
        }
    })
}

module.exports = {
    home,
    pruebas,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    getCounters,
    updateUser,
    uploadImage,
    getImageFile,
}