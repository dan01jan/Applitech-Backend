// const expressjwt = require('express-jwt');
const { expressjwt: jwt } = require("express-jwt");
function authJwt() {
    const secret = process.env.secret;
    const api = process.env.API_URL;
    return jwt({
        secret,
        algorithms: ['HS256'],
        // isRevoked: isRevoked
    })
        .unless({
            path: [
                { url: "/", methods: ['GET','POST', 'PUT', 'OPTIONS', 'DELETE'] }, 
                {
                    url: /\/api\/v1\/products(.*)/,
                    methods: ['GET', 'POST', 'PUT', 'OPTIONS']
                },
                {
                    url: /\/api\/v1\/brands(.*)/,
                    methods: ['GET', 'POST', 'PUT', 'OPTIONS', 'DELETE']
                },
                {
                    url: /\/api\/v1\/categories(.*)/,
                    methods: ['GET', 'POST', 'PUT', 'OPTIONS', 'DELETE']
                },
                {
                    url: /\/api\/v1\/orders(.*)/,
                    methods: ['GET', 'POST', 'PUT', 'OPTIONS']
                },
                {
                    url: /\/public\/uploads(.*)/,
                    methods: ['GET', 'OPTIONS', 'POST', 'DELETE']
                },
                `${api}/users`,
                `${api}/users/login`,
                `${api}/users/register`,
                `${api}/users/google_login`,
            ]
        })
}

async function isRevoked(req, payload, done) {
    if (!payload.isAdmin) {
        done(null, true)
    }
    done();
}



module.exports = authJwt