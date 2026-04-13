const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const authService = require('./auth.service');
const userService = require('../user/user.service');
const tokenService = require('./token.service');
const emailService = require('./email.service');
const response = require('../../config/response');
const ApiError = require('../../utils/ApiError');
const register = catchAsync(async (req, res) => {
  const { email, fullName, firstName, lastName, password, ...rest } = req.body;
  const isUser = await userService.getUserByEmail(email);

  const name = fullName || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '');

  if (isUser) {
    if (isUser.isDeleted || !isUser.isEmailVerified) {
      // Update existing half-registered or deleted user
      await prisma.user.update({
        where: { id: isUser.id },
        data: {
          fullName: name,
          firstName,
          lastName,
          email,
          isDeleted: false,
          role: 'USER', // FORCE ROLE TO USER
          ...rest
        },
      });
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
  } else {
    // Create new user
    await userService.createUser({
      fullName: name,
      firstName,
      lastName,
      email,
      password,
      role: 'USER' // FORCE ROLE TO USER
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.user.update({
    where: { email },
    data: { oneTimeCode: otp },
  });

  emailService.sendVerificationEmail(email, otp).catch((e) => console.error('Email error:', e));

  res.status(httpStatus.CREATED).json(
    response({
      message: 'Thank you for registering. Please verify your email',
      status: 'OK',
      statusCode: httpStatus.CREATED,
      data: {},
    })
  );
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const isUser = await userService.getUserByEmail(email);

  if (!isUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
  }
  if (isUser.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This Account is Deleted');
  }
  if (!isUser.isEmailVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email not verified');
  }

  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);

  res.status(httpStatus.OK).json(
    response({
      message: 'Login Successful',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { user, tokens },
    })
  );
});

const verifyEmail = catchAsync(async (req, res) => {
  const { email, code } = req.body;
  const user = await authService.verifyEmail(email, code);
  const tokens = await tokenService.generateAuthTokens(user);

  res.status(httpStatus.OK).json(
    response({
      message: 'Email Verified',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { user, tokens },
    })
  );
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.user.update({
    where: { id: req.user.id },
    data: { oneTimeCode: otp },
  });
  await emailService.sendVerificationEmail(req.user.email, otp);
  res.status(httpStatus.NO_CONTENT).send();
});

const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
  }

  const oneTimeCode = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.user.update({
    where: { id: user.id },
    data: { oneTimeCode, isResetPassword: true },
  });

  await emailService.sendResetPasswordEmail(email, oneTimeCode);
  res.status(httpStatus.OK).json(
    response({
      message: 'Email Sent',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: {},
    })
  );
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body.password, req.body.email);
  res.status(httpStatus.OK).json(
    response({
      message: 'Password Reset Successful',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: {},
    })
  );
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.OK).json(
    response({
      message: 'LogOut Successful',
      status: 'OK',
      statusCode: httpStatus.OK,
    })
  );
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
  res.status(httpStatus.OK).json(
    response({
      message: 'Password Change Successful',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: {},
    })
  );
});

const deleteMe = catchAsync(async (req, res) => {
  const user = await authService.deleteMe(req.user.id, req.body.password);
  res.status(httpStatus.OK).json(
    response({
      message: 'Account Deleted',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { user },
    })
  );
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  verifyEmail,
  sendVerificationEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteMe,
};
