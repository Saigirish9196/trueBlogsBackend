const {check}= require('express-validator')

exports.validatorMsgTag =[
  check('name').not().isEmpty()
  .withMessage('please required name.')
]