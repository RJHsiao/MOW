
/*
 * Models
 */

var Q = require('q');
var crypto = require('crypto');
var db = require('mongoskin').db('mow:mow123@localhost/mow');
var radix64 = require('radix64').radix64;

exports.checkUserExist = Q.denodeify(function(name, callback) {
	db.collection('users').count({name: new RegExp(name, 'i')}, function(err, count) {
		isExist = true;
		if (count == 0) isExist = false;
		callback(err, isExist);
	});
});

exports.createUser = Q.denodeify(function(name, passwd, displayName, email, ip, callback) {
	createTime = new Date();
	sha512sum = crypto.createHash('sha512');
	sha512sum.update(passwd + createTime.toISOString());
	db.collection('users').insert(
		{
			name: name,
			passwd: sha512sum.digest('hex'),
			displayName: displayName,
			email: email,
			createTime: createTime,
			lastLoginTime: createTime,
			lastLoginIP: ip,
			connectSid: ''
		},
		callback
	);
});

exports.getUserInfo = Q.denodeify(function(name, callback) {
	db.collection('users').findOne(
		{name: new RegExp(name, 'i')},
		{passwd: 0, ip: 0, connectSid: 0},
		function(err, result) {
			callback(err, result);
		}
	);
});

exports.getUserIsLogin = Q.denodeify(function(name, sid, callback) {
	db.collection('users').findOne(
		{name: new RegExp(name, 'i'), connectSid: sid},
		{name: 1, displayName: 1, connectSid: 1},
		function(err, result) {
			callback(err, result);
		}
	);
});

exports.getUserNames = Q.denodeify(function(name, callback) {
	db.collection('users').findOne(
		{name: new RegExp(name, 'i')},
		{name: 1, displayName: 1},
		function(err, result) {
			callback(err, result);
		}
	);
});

exports.updateUserForLogin = Q.denodeify(function(name, passwd, ip, sid, callback) {
	db.collection('users').findOne(
		{name: new RegExp(name, 'i')}, 
		{name: 1, displayName: 1 ,passwd: 1, createTime: 1},
		function(err, result) {
			if(result) {
				sha512sum = crypto.createHash('sha512');
				sha512sum.update(passwd + result.createTime.toISOString());
				if(sha512sum.digest('hex') == result.passwd) {
					lastLoginTime = new Date();
					db.collection('users').update(
						{_id: result._id},
						{$set: {
							lastLoginTime: lastLoginTime,
							lastLoginIP: ip,
							connectSid: sid
						}},
						function(err) {
							if(err) {
								throw err;
								callback(err, false);
							} else {
								callback(err, {name: name, displayName: result.displayName});
							}
						}
					);
				} else {
					callback(err, false);
				}
			} else {
				callback(err, false);
			}
		}
	);
});

exports.updateUserForLogout = Q.denodeify(function(name, passwd, ip, sid, callback) {
	db.collection('users').update(
		{name: new RegExp(name, 'i')}, 
		{$set: {connectSid: ''}},
		callback
	);
});

exports.createRoom = Q.denodeify(function(room, callback) {
	createTime = new Date();
	id = radix64(createTime);
	db.collection('rooms').insert(
		{
			id: id,
			name: room.name,
			passwd: room.passwd || '',
			description: room.description,
			admin: room.admin,
			speaker: room.admin,
			isHidden: room.isHidden,
			createTime: createTime,
			members: [],
			pdf: '',
			drawCanvas: '',
			youtubeVideoID: ''
		},
		callback
	);
});

exports.getRoom = Q.denodeify(function(id, callback) {
	db.collection('rooms').findOne({id: id}, callback);
});

exports.joinRoom = Q.denodeify(function(id, user, callback) {
	db.collection('rooms').update({id: id}, {$push: {members: user}}, callback);
});