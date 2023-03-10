const nodemailer = require('nodemailer');
const pug = require('pug');
const juice = require('juice');
const { htmlToText } = require('html-to-text');
const promisify = require('es6-promisify');

const transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

const generateHTML = (filename, options = {}) => {
    const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options);
    const inlined = juice(html);
    return inlined;
};

exports.send = async (options) => {
    const html = generateHTML(options.filename, options);
    const text = htmlToText(html);
    const mailOptions = {
        from: 'Molo <noreply@molo.com>',
        to: options.user.email,
        subject: options.subject,
        html,
        text
    };
    const sendMail = promisify(transport.sendMail, transport);
    return sendMail(mailOptions);
}

// transport.sendMail({
//     from: 'Molo <molo@gmail.com>',
//     to: 'test@example.com',
//     subject: 'Testing',
//     html: 'This is a <strong>test</strong> email',
//     text: 'This is a test email'
// });