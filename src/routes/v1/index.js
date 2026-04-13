const express = require('express');
const authRoute = require('../../modules/auth/auth.route');
const userRoute = require('../../modules/user/user.route');
const aboutUsRoute = require('../../modules/aboutUs/aboutUs.route');
const privacyPolicyRoute = require('../../modules/privacyPolicy/privacyPolicy.route');
const termsConditionsRoute = require('../../modules/termsConditions/termsConditions.route');
const docsRoute = require('./docs.routes');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  
  {
    path: '/about-us',
    route: aboutUsRoute,
  },
  {
    path: '/privacy-policies',
    route: privacyPolicyRoute,
  },
  {
    path: '/terms-conditions',
    route: termsConditionsRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
