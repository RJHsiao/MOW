
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , models = require('./models')
//  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , io = require('socket.io')
  , Q = require('q');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
  app.use(express.cookieParser('asdfghjkl'));
  app.use(express.session());
app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.post('/', routes.login);
app.get('/signup', routes.signup);
app.post('/signup', routes.createUser);
app.post('/', routes.login);
app.get('/logout', routes.logout);
app.get('/user/:userID', routes.userInfo);
app.post('/createroom', routes.createRoom);
app.get('/room/:roomID', routes.joinRoom);
app.post('/room/:roomID', routes.joinRoomWithAuth);
app.get('/search', routes.search);

//app.get('/users', user.list);

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var io = io.listen(server);

io.sockets.on('connection', function (socket) {
	socket.emit('news', { hello: 'world' });
	socket.on('joinRoom', function (data) {
		socket.join(data.room);
		console.dir(socket);
		models.getRoomForSocket(data.room).then(function(result) {
			data.user.socketID = socket.id;
			models.joinRoom(data.room, data.user).then(function() {
				result.members.push(data.user);
				socket.emit('joinOK', result);
				socket.broadcast.to(data.room).emit('addUser', data.user);
			});
		});
	});
	socket.on('leaveRoom', function (data) {
		models.leaveRoom(data.room, data.user).then(function() {});
		socket.broadcast.to(data.room).emit('removeUser', data.user);
	});
	socket.on('setDisplayState', function (data) {
		models.setRoomDisplayState(data.room, data.state).then(function() {});
		if (data.state == '#room_pdfDisplayArea') {
			models.setPdfFile(data.room, data.option).then(function() {});
		}
		if (data.state == '#room_youtubeDisplayArea') {
			models.setYoutubeVideo(data.room, data.option).then(function() {});
		}
		socket.broadcast.to(data.room).emit('setDisplayState', {state: data.state, option: data.option});
	});
	socket.on('setDrawCanvas',function (data) {
		models.setDrawCanvas(data.room, data.drawCanvas).then(function() {});
		socket.broadcast.to(data.room).emit('setDrawCanvas', data.drawCanvas);
	});
	socket.on('setPdfPage', function (data) {
		socket.broadcast.to(data.room).emit('setPdfPage', data.pageNum);
	});
	socket.on('setYoutubeSync', function (data) {
		socket.broadcast.to(data.room).emit('setYoutubeSync', {state: data.state, time: data.time});
	});
	socket.on('textMsg', function (data) {
		socket.broadcast.to(data.room).emit('textMsg', {user: data.user, msg: data.msg})
	});
});