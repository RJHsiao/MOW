
/*
 * Routes
 */

var models = require('../models');
//var crypto = require('crypto');
var Q = require('q');

exports.index = function(req, res){
	if (req.signedCookies.userID && req.signedCookies.displayName && req.signedCookies['connect.sid']) {
		models.getUserIsLogin(req.signedCookies.userID, req.signedCookies['connect.sid']).then(function(result) {
			if (result) {
				res.render('index', {
					isLogin: true,
					isLoginError: false,
					userID: result.name,
					displayName: result.displayName
				});
			} else{
				res.render('index', {
					isLogin: false,
					isLoginError: false,
					userID: '',
					displayName: ''
				});
			}
		});
	} else {
		res.render('index', {
			isLogin: false,
			isLoginError: false,
			userID: '',
			displayName: ''
		});
	}
};

exports.login = function(req, res){
	models.updateUserForLogin(req.body.userID, req.body.passwd, req.ip, req.signedCookies['connect.sid']).then(function(result) {
		if (result) {
			res.cookie('userID', result.name, {signed: true});
			res.cookie('displayName', result.displayName, {signed: true});
			//res.cookie('roomID', '', {signed: true});
			res.redirect('/');
		} else {
			res.render('index', {
				isLogin: false,
				isLoginError: true,
				userID: '',
				displayName: ''
			});
		}
	});
};

exports.signup = function(req, res){
	res.render('signup',{
		userID: '',
		displayName: '',
		email: '',
		isExist: false
	});
};

exports.createUser = function(req, res){
	userID = req.body.userID;
	passwd = req.body.passwd;
	displayName = req.body.displayName;
	email = req.body.email;
	models.checkUserExist(userID).then(function(isExist) {
		if (isExist) {
			res.render('signup',{
				userID: userID,
				displayName: displayName,
				email: email,
				isExist: isExist
			});
		} else {
			models.createUser(userID, passwd, displayName, email, req.ip).then(function(result) {
				if(result) {
					res.set({'refresh': '2; url=/'});
					res.send('User Created.');
				} else {
					res.send('error!');
				}
			});
		}
	});
};

exports.logout = function(req, res){
	models.updateUserForLogout(req.signedCookies.userID);
	res.clearCookie('userID');
	res.clearCookie('displayName');
	res.clearCookie('connect.sid');
	res.clearCookie('roomID');
	res.redirect('/');
};

exports.userInfo = function(req, res){
	if (req.signedCookies.userID && req.signedCookies.displayName && req.signedCookies['connect.sid']) {
		models.getUserIsLogin(req.signedCookies.userID, req.signedCookies['connect.sid']).then(function(result) {
			if (result) {
				models.getUserInfo(req.params.userID).then(function(result) {
					res.render('user', {
						userID: result.name,
						displayName: result.displayName,
						email: result.email,
						lastLoginTime: result.lastLoginTime
					});
				});
			} else {
				res.status(403).set({'refresh': '2; url=/'}).send('Please Login first!');
			}
		});
	} else {
		res.status(403).set({'refresh': '2; url=/'}).send('Please Login first!');
	}
};

exports.createRoom = function(req, res) {
	if (req.body.isHidden) {
		req.body.isHidden = true;
	} else {
		req.body.isHidden = false;
	}
	room = {
		name: req.body.roomName,
		description: req.body.description,
		admin: req.signedCookies.userID,
		isHidden: req.body.isHidden,
		passwd: req.body.passwd
	}
	models.createRoom(room).then(function(result) {
		res.redirect('/room/' + result[0].id);
	});
}

exports.joinRoom = function(req, res){
	if (req.signedCookies.userID && req.signedCookies.displayName && req.signedCookies['connect.sid']) {
		models.getUserIsLogin(req.signedCookies.userID, req.signedCookies['connect.sid']).then(function(result) {
			if (result) {
				models.getRoom(req.params.roomID).then(function(result) {
					if (result) {
						if (result.passwd) res.render('roomAuth', {roomID: result.id, isAuthError: false});
						else {
							user = {name: req.signedCookies.userID, displayName: req.signedCookies.displayName};
							//models.joinRoom(result.id, user).then(function() {
							//	result.members.push(user);
								/*room = {};
								for (i in result) {
									if ( i != 'passwd' && i != '_id') room[i] = result[i];
								}*/
								delete result.passwd;
								delete result._id;
								res.render('room', {
									userID: req.signedCookies.userID,
									displayName: req.signedCookies.displayName,
									room: result
								});
							//});
						}
					} else {
						res.status(404).set({'refresh': '2; url=/'}).send('room_id: ' + req.params.roomID + 'is not exist!');
					}
				});
			} else {
				res.status(403).set({'refresh': '2; url=/'}).send('Please Login first!');
			}
		});
	} else {
		res.status(403).set({'refresh': '2; url=/'}).send('Please Login first!');
	}
}

exports.joinRoomWithAuth = function(req, res){
	models.getRoom(req.params.roomID).then(function(result) {
		if(result) {
			if (req.body.passwd == result.passwd) {
				user = {name: req.signedCookies.userID, displayName: req.signedCookies.displayName};
				//models.joinRoom(result.id, user).then(function() {
				//	result.members.push(user);
					/*room = {};
					for (i in result) {
						if ( i != 'passwd' && i != '_id') room[i] = result[i];
					}*/
					delete result.passwd;
					delete result._id;
					res.render('room', {
						userID: req.signedCookies.userID,
						displayName: req.signedCookies.displayName,
						room: result
					});
				//});
			} else {
				res.render('roomAuth', {roomID: result.id, isAuthError: true});
			}
		} else {
			res.status(404).set({'refresh': '2; url=/'}).send('room_id: ' + req.params.roomID + 'is not exist!');
		}
	});
}

exports.search = function(req, res){
	if (req.signedCookies.userID && req.signedCookies.displayName && req.signedCookies['connect.sid']) {
		models.getUserIsLogin(req.signedCookies.userID, req.signedCookies['connect.sid']).then(function(result) {
			if (result) {
				models.search(req.query.room.split(" ")).then(function(result) {
					res.render('search', {
						userID: req.signedCookies.userID,
						displayName: req.signedCookies.displayName,
						keywords: req.query.room,
						rooms: result
					});
				});
			} else {
				res.status(403).set({'refresh': '2; url=/'}).send('Please Login first!');
			}
		});
	} else {
		res.status(403).set({'refresh': '2; url=/'}).send('Please Login first!');
	}
}