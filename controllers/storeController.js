const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/');
        if (isPhoto) {
            next(null, true);
        } else {
            next({ message: `The file type isn't allowed` }, false);
        }
    }
};

exports.homePage = (req, res) => {
    res.render('index');
}

exports.addStore = (req, res) => {
    res.render('editStore', { title: 'Add Store' });
}

const confirmOwner = (store, user) => {
    if (!store.author.equals(user._id)) {
        throw Error("You can't edit a store that you don't own!");
    }
};

exports.editStore = async (req, res) => {
    const store = await Store.findOne({ _id: req.params.id });
    confirmOwner(store, req.user);
    res.render('editStore', { title: `Edit ${store.name}`, store });
}

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
    if (!req.file) return next();
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    next();
}

exports.createStore = async (req, res) => {
    req.body.author = req.user._id;
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully created ${store.name}. Care to leave a review?!`);
    res.redirect(`/stores/${store.slug}`);
}

exports.updateStore = async (req, res) => {
    req.body.location.type = 'Point';
    const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
        new: true,
        runValidators: true
    }).exec();
    req.flash('success', `You've updated the <strong>${store.name}</strong> store. <a href="/stores/${store.slug}">View Store ⤵</a>`);
    res.redirect(`/stores/${store._id}/edit`);
}

exports.getStores = async (req, res) => {
    const page = req.params.page || 1;
    const limit = 4;
    const skip = limit * (page - 1);
    const storesPromise = Store
        .find()
        .skip(skip)
        .limit(limit);
    const countPromise = Store.count();
    const [stores, count] = await Promise.all([storesPromise, countPromise]);
    const pages = Math.ceil(count / limit);
    if (!stores.length && skip) {
        req.flash('info', `The page you've requested doesn't exist! We'll redirect you to page ${pages} the last page of results found`);
        res.redirect(`/stores/page/${pages}`);
        return;
    }
    res.render('stores', { title: 'All Stores', stores, pages, page, count });
}

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({ slug: req.params.slug }).populate('author reviews');
    if (!store) return next();
    res.render('store', { title: store.name, store });
}

exports.getStoresByTag = async (req, res) => {
    const { tag } = req.params;
    const tagQuery = tag || { $exists: true };
    const tagsPromise = Store.getTagsList();
    const storesPromise = Store.find({ tags: tagQuery });
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
    res.render('tags', { title: 'Tags', tags, stores, tag });
}

exports.searchStores = async (req, res) => {
    const stores = await Store
        .find({
            $text: {
                $search: req.query.q
            }
        }, {
            score: { $meta: 'textScore' }
        })
        .sort({
            score: { $meta: 'textScore' }
        })
        .limit(5);
    res.json(stores);
};

exports.mapStores = async (req, res) => {
    const { lat, lng } = req.query;
    const coordinates = [lng, lat].map(parseFloat);
    const query = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates
                },
                $maxDistance: 10000
            }
        }
    };
    const stores = await Store.find(query).select('name slug description location photo').limit(10);
    res.json(stores);
};

exports.mapPage = (req, res) => {
    res.render('map', { title: 'Map' });
}

exports.heartStore = async (req, res) => {
    const hearts = req.user.hearts.map(obj => obj.toString());
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { [operator]: { hearts: req.params.id } },
        { new: true }
    );
    res.json(user);
}

exports.getHeartedStores = async (req, res) => {
    const stores = await Store.find({
        _id: { $in: req.user.hearts }
    });
    res.render('stores', { title: 'Hearted Stores', stores });
}

exports.topStores = async (req, res) => {
    const stores = await Store.getTopStores();
    res.render('topStores', { title: 'Top Stores', stores });
};