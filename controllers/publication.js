'user strict'

var mongoosePaginate = require('mongoose-pagination')
var fs = require('fs')
var path = require('path')
var moment = require('moment')

var User = require('../models/user')
var Follow = require('../models/follow')
var Publication = require('../models/publication')

function prueba (req,res){
    res.status(200).send({
        message: "Prueba Publicaciones"
    })
}

function savePublication(req, res){
    var params = req.body
    if(!params.text)
        return res.status(200).send({message : 'Debes enviar un texto'});

    var publication = new Publication();
    publication.text = params.text;
    publication.file = null;
    publication.user = req.user.sub;
    publication.created_at = moment().unix();

    publication.save((err, publicationStored) =>{
        if(err)
            return res.status(500).send({message : 'Error al guardar la publicacion'})
        if(!publicationStored)
            return res.status(404).send({message : 'La publicacion no ha sido guardada'})

        return res.status(200).send({publication : publicationStored})
    })

}

function getPublications(req,res){
    var page = 1;
    if(req.params.page)
        page = req.params.page

    var itemsPerPage = 5;

    Follow.find({ user: req.user.sub}).populate('followed').exec().then((follows) => {

        var follows_clean = [];

        follows.forEach((follow) =>{
            follows_clean.push(follow.followed)
        });

        Publication.find({user : {"$in" : follows_clean}}).sort('-created_at').populate('user').paginate(page,itemsPerPage, (err, publications, total) =>{
            if(err)
                return res.status(500).send({message: 'Error al devolver publicaciones'});
            if(!publications)
                return res.status(404).send({message : 'No hay publicaciones'})
            return res.status(200).send({
                publications,
                total : total,
                page : page,
                pages : Math.ceil(total/itemsPerPage)
            })
        });

    }).catch((err) => {
        return res.status(500).send({message: 'Error al devolver el seguimiento'});
    });
}

function getPublication(req,res){
    var publication_id = req.params.id;

    Publication.findById(publication_id, (err, publication) =>{
        if(err)
            return res.status(500).send({message: 'Error al devolver publicacione'});
        if(!publication)
            return res.status(404).send({message : 'No existe la publicacion'})
        return res.status(200).send({publication})
    })
}


function deletePublication(req,res){
    var publication_id = req.params.id;

    Publication.find({user: req.user.sub , '_id' : publication_id}).remove((err) =>{
        if(err)
            return res.status(500).send({message: 'Error al borrar publicacion'});
        return res.status(200).send({message : 'Publicacion eliminada correctamente'})
    })
}

function uploadImage(req,res){
    var publicationId = req.params.id;

    if(req.files){
        var file_path = req.files.image.path;

        // Obtenemos el nombre del archivo
        var file_split = file_path.split('\\');
        var file_name = file_split[2];

        // Obtenemos la extension del archivo
        var ext_split = file_name.split('\.');
        var file_ext = ext_split[1]


        if(file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif'){
            Publication.findOne({'user' : req.user.sub , '_id' : publicationId}).exec().then((publication) =>{
                if(publication)
                    Publication.findByIdAndUpdate(publicationId, {file: file_name}, {new : true , useFindAndModify: false } , (err, publicationUpdated) =>{
                        if(err)
                            return res.status(500).send({message: 'Error en la Peticion'})
                        if(!publicationUpdated)
                            return res.status(404).send({message: 'No se ha podido actualizar el usuario'})
                
                        return res.status(200).send({user:publicationUpdated})
                    })
                else
                    return res.status(200).send({message: 'No tienes permiso para actualizar esta publicacion'})
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
    var path_file = './uploads/publications/'+ image_file;

    fs.exists(path_file,(exists)=>{
        if(exists){
            res.sendFile(path.resolve(path_file))
        }else{
            return res.status(200).send({message: 'No existe la imagen'})
        }
    })
}


module.exports = {
    savePublication,
    getPublications,
    getPublication,
    deletePublication,
    uploadImage,
    getImageFile
}