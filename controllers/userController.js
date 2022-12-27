const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
    res.render('login', { title: 'Login' });
}

exports.registerForm = (req, res) => {
    res.render('register', { title: 'Register' });
}

exports.validateRegister = (req, res, next) => {
    req.sanitizeBody('name');
    req.checkBody('name', 'You must supply a name!').notEmpty();
    req.checkBody('email', 'You must supply an email address!').isEmail();
    req.sanitizeBody('email').normalizeEmail({
        gmail_remove_dots: false,
        remove_extensions: false,
        gmail_remove_subaddress: false
    });
    req.checkBody('password', "Password can't be blank!").notEmpty();
    req.checkBody('password-confirm', 'You have to confirm your password!').notEmpty();
    req.checkBody('password-confirm', "Please re-enter your password - No match!").equals(req.body.password);

    const errors = req.validationErrors();
    if (errors) {
        req.flash('error', errors.map(err => err.msg));
        res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
        return;
    }
    next();
}

exports.register = async (req, res, next) => {
    const { email, name, password } = req.body;
    console.log(email);
    const user = new User({ email, name });
    const register = promisify(User.register, User);
    await register(user, password);
    next();
}

exports.account = (req, res) => {
    res.render('account', { title: 'Edit Your Acoount' })
};

exports.updateAccount = async (req, res) => {
    const { name, email } = req.body;
    const updates = { name, email };
    const user = await User.findOneAndUpdate(
        { _id: req.user._id },
        { $set: updates },
        { new: true, runValidators: true, context: 'query' }
    );
    req.flash('success', "You've successfully updated your account");
    res.redirect('back');
};