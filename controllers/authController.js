const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const crypto = require('crypto');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Failed Login',
    successRedirect: '/',
    successMessage: 'You are logged in'
});

exports.logout = (req, res) => {
    req.logout();
    req.flash('success', "You're now logged out 👋");
    res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    req.flash('error', 'You must be logged in!!');
    res.redirect('/login');
};

exports.forgot = async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        req.flash('error', 'No account found with this email address!');
        return res.redirect('/login');
    }
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();
    const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
    await mail.send({
        user,
        subject: 'Password Reset',
        resetURL,
        filename: 'password-reset'
    });
    req.flash('success', `You've been emailed a password reset link
    ${resetURL}`);
    res.redirect('/login');
}

exports.reset = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
        req.flash('error', 'Password token is invalid or expired!!');
        return res.redirect('/login');
    }
    res.render('reset', { title: 'Reset Password ' });
}

exports.confirmPassword = (req, res, next) => {
    if (req.body.password === req.body['password-confirm']) return next();
    req.flash('error', "Passwords don't match!");
    res.redirect('back');
};

exports.update = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
        req.flash('error', 'Password token is invalid or expired!!');
        return res.redirect('/login');
    }
    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    const updatedUser = await user.save();
    await req.login(updatedUser);
    req.flash('success', "You've reset your account. Welcome back!");
    res.redirect('/');
};