/* Set height after loaded */
window.onload = function() {
	var basicLength = $('#room_container').width() / 12;

	$('#room_main').height(basicLength * 6);
	$('#room_sidebar').height(basicLength * 6);
	$('#room_textMsgDisplayArea').css('padding', '5px 10px');
	$('#room_textMsgDisplayArea').height(
		$('#room_sidebar').height() - 
		$('#room_selfVideoPanel').outerHeight(true) - 
		$('#room_textMsgPanel .panel-heading').outerHeight(true) - 
		$('#room_textMsgPanel .panel-footer').outerHeight(true) - 10
	);
	/* set Drawing Canvas area size */
	$('#room_drawingCanvas').width($('#room_main').width());
	$('#room_drawingCanvas').height($('#room_main').height() - $('#room_drawingCanvasNavBar').outerHeight(true) - 35);
}
/* Detect and ask before page reloading or closing or changing */
window.onbeforeunload = function() {
	return "";
}
window.onunload = function() {
	socket.emit('leaveRoom', {user: myself, room: room.id});
}

/* Show selected displayer in room_main and hide otherwise */
showDisplayArea = function(selectedDisplayArea) {
	room.displayState = selectedDisplayArea;
	$('#room_main').children().addClass('hidden');
	$(selectedDisplayArea).removeClass('hidden');
	if (selectedDisplayArea == '#room_speakerWebcamDisplayArea') {
		if ($('#room_speakerWebcamDisplayArea video') != []) {
			if ($('#room_speakerWebcamDisplayArea video').prop('id')) {
				$('#room_members').append$('#room_speakerWebcamDisplayArea video');
				$('#room_members').last[0].play();
			} else {
				$('#room_selfVideo').append($('#room_speakerWebcamDisplayArea video'));
				$('#room_selfVideo video')[0].play();
			}
		}
		if (room.speaker == myself.name) {
			$('#room_speakerWebcamDisplayArea').append($('#room_selfVideo video'));
			$('#room_speakerWebcamDisplayArea video')[0].play();
		} else {
			var speakerWebrtcSID;
			for (i in room.members){
				if (room.members[i].name == room.speaker) {
					speakerWebrtcSID = room.members[i].webrtcSID;
					break;
				}
			}
			var chkInterval = setInterval(function() {
				if($('#' + speakerWebrtcSID + '_video_incoming') != []) {
					$('#room_speakerWebcamDisplayArea').append($('#' + speakerWebrtcSID + '_video_incoming'));
					$('#room_speakerWebcamDisplayArea video')[0].play();
					clearInterval(chkInterval);
				}
			}, 300);
		}
	} else {
		if ($('#room_speakerWebcamDisplayArea video') != []) {
			if ($('#room_speakerWebcamDisplayArea video').prop('id')) {
				$('#room_members').append$('#room_speakerWebcamDisplayArea video');
				$('#room_members').last[0].play();
			} else {
				$('#room_selfVideo').append($('#room_speakerWebcamDisplayArea video'));
				$('#room_selfVideo video')[0].play();
			}
		}
	}
}

var changeAuthOpUIStatus = function() {
	if (room.admin == myself.name) $('.admin-ctrl').removeClass('hidden');
	else $('.admin-ctrl').addClass('hidden');
	if (room.speaker == myself.name) $('.speaker-ctrl').removeClass('hidden');
	else $('.speaker-ctrl').addClass('hidden');
}

/* Work about showing Webcam videos */
var webrtc = new SimpleWebRTC({
	localVideoEl: 'room_selfVideo',
	remoteVideosEl: 'room_members',
	autoRequestMedia: true,
	log: true
});

webrtc.on('readyToCall', function () {
	webrtc.joinRoom("mow_" + room.id);
	myself.webrtcSID = webrtc.connection.socket.sessionid;
	//console.log(myself.webrtcSID); //////
	socket.emit('joinRoom', {user: myself, room: room.id});
	socket.on('joinOK', function(data) {
		room.admin = data.admin;
		room.speaker = data.speaker;
		room.members = data.members;
		room.pdf = data.pdf;
		room.youtubeVideo = data.youtubeVideo;
		room.drawCanvas = data.drawCanvas;
		room.displayState = data.displayState
		for (i in room.members) {
			user = room.members[i];
			$('#room_membersList').append('<li id="user_list_' + user.name + '"><a href="/user/' + user.name + '" target="_blank">' + user.displayName + '</a></li>');
			$('#room_selectAdmin').append('<option id="setAdmin_' + user.name + '" value="' + user.name + '">' + user.displayName + '</option>');
			$('#room_selectSpeaker').append('<option id="setSpeaker_' + user.name + '" value="' + user.name + '">' + user.displayName + '</option>');
		}
		showDisplayArea(room.displayState);
		changeAuthOpUIStatus();
	});
});

/* Socket.io proccessing */
socket.on('addUser', function (user) {
	room.members.push(user);
	$('#room_membersList').append('<li id="user_list_' + user.name + '"><a href="/user/' + user.name + '" target="_blank">' + user.displayName + '</a></li>');
	$('#room_selectAdmin').append('<option id="setAdmin_' + user.name + '" value="' + user.name + '">' + user.displayName + '</option>');
	$('#room_selectSpeaker').append('<option id="setSpeaker_' + user.name + '" value="' + user.name + '">' + user.displayName + '</option>');
	insertTextMsg('System', 'User "' + user.displayName + '" joined this room.');
});

socket.on('removeUser', function (user) {
	room.members.push(user);
	$('#userList_' + user.name).remove();
	$('#setAdmin_' + user.name).remove();
	$('#setSpeaker_' + user.name).remove();
	if (user.name == room.speaker && room.displayState == '#room_speakerWebcamDisplayArea') {
		$('#room_speakerWebcamDisplayArea video').remove();
		room.speaker = room.admin;
	}
	insertTextMsg('System', 'User "' + user.displayName + '" leaved this room.');
});

socket.on('setDisplayState', function (data) {
	switch (data.state) {
		case '#room_speakerWebcamDisplayArea':
			showDisplayArea('#room_speakerWebcamDisplayArea');
			break;
		case '#room_drawingCanvasDisplayArea':
			loadDrawingCanvas(data.option);
			break;
		case '#room_pdfDisplayArea':
			loadPdf(data.option.dataurl, data.option.filename);
			break;
		case '#room_youtubeDisplayArea':
			loadYoutubeVideo(data.option.id, data.option.playOnReady);
			break;
	}
});

socket.on('setDrawCanvas', function (drawCanvas) {
	room.drawCanvas = drawCanvas;
	$('#room_drawingCanvas img').prop('src', drawCanvas);
});

socket.on('setPdfPage', function (pageNum) {
	pdfPageNum = pageNum;
	renderPdfNstPage(pageNum);
});

socket.on('setYoutubeSync', function (data) {
	youtubePlayer.seekTo(data.time, true);
	if (data.state == 1) youtubePlayer.playVideo();
	else youtubePlayer.pauseVideo();
});

socket.on('textMsg', function (data) {
	insertTextMsg(data.user, data.msg);
});

/* Work about speaker webcam */
$('#room_setSpeakerWebcam').click(function() {
	socket.emit('setDisplayState', {
		room: room.id,
		state: '#room_speakerWebcamDisplayArea',
		option: ''
	});
	showDisplayArea('#room_speakerWebcamDisplayArea');
});

/* Work about showing drawing Canvas */
var drawingCanvas;
var drawingCanvasStepCount = -1;
var drawingCanvasTmpElement;
var drawingCanvasStyle = 'pencil';
var pointFrom = {};
var pointTo = {};
var isMouseDown = false;
var svgFileReader = new FileReader();
$('input[name=room_drawingStyle]').change(function(e) {
	drawingCanvasStyle = e.target.value;
});

svgFileReader.onloadend = function() {
	document.getElementById('room_svgCanvasDataURL').href = svgFileReader.result;
	console.log(svgFileReader.result);
	socket.emit('setDrawCanvas', {room: room.id, drawCanvas: svgFileReader.result});
}

function loadDrawingCanvas(cleanCanvas) {
	if (room.speaker == myself.name) {
		if (cleanCanvas) {
			drawingCanvas.clear();
			drawingCanvasStepCount = -1;
		}
	} else {
		if (!drawingCanvas) {
			img = document.createElement('img');
			img.width = $('#room_drawingCanvas').width();
			img.height = $('#room_drawingCanvas').height();
			document.getElementById('room_drawingCanvas').appendChild(img);
		}
		if (cleanCanvas) $('#room_drawingCanvas img').prop('src', '');
	}
	showDisplayArea('#room_drawingCanvasDisplayArea');
}

$('#room_loadDrawingCanvas').click(function() {
	if (!drawingCanvas) {
		drawingCanvas = SVG('room_drawingCanvas');
		drawingCanvas.node.onmousedown = function(e) {
			if (e.button == 0) {
				isMouseDown = true;
				pointFrom = {x: e.layerX, y: e.layerY};
				drawingCanvasStepCount++;
				switch (drawingCanvasStyle) {
					case "pencil":
						drawingCanvasTmpElement = drawingCanvas.polyline().attr({
							id: 'step_' + drawingCanvasStepCount,
							points: pointFrom.x + ',' + pointFrom.y + ' ' + pointFrom.x + ',' + pointFrom.y,
							stroke: $('#room_drawingColor').val(),
							'stroke-width': 2,
							fill: 'none'
						});
						break;
					case "line":
						drawingCanvasTmpElement = drawingCanvas.line().attr({
							id: 'step_' + drawingCanvasStepCount,
							x1: pointFrom.x,
							y1: pointFrom.y,
							x2: pointFrom.x,
							y2: pointFrom.y,
							stroke: $('#room_drawingColor').val(),
							'stroke-width': 2
						});
						break;
					case "rect":
						drawingCanvasTmpElement = drawingCanvas.rect().attr({
							id: 'step_' + drawingCanvasStepCount,
							x: pointFrom.x,
							y: pointFrom.y,
							width: 0,
							height: 0,
							stroke: 'none',
							fill: $('#room_drawingColor').val()
						});
						break;
					case "rect_o":
						drawingCanvasTmpElement = drawingCanvas.rect().attr({
							id: 'step_' + drawingCanvasStepCount,
							x: pointFrom.x,
							y: pointFrom.y,
							width: 0,
							height: 0,
							stroke: $('#room_drawingColor').val(),
							'stroke-width': 2,
							fill: 'none'
						});
						break;
					case "ellipse":
						drawingCanvasTmpElement = drawingCanvas.ellipse().attr({
							id: 'step_' + drawingCanvasStepCount,
							cx: pointFrom.x,
							cy: pointFrom.y,
							rx: 0,
							ry: 0,
							stroke: 'none',
							fill: $('#room_drawingColor').val()
						});
						break;
					case "ellipse_o":
						drawingCanvasTmpElement = drawingCanvas.ellipse().attr({
							id: 'step_' + drawingCanvasStepCount,
							cx: pointFrom.x,
							cy: pointFrom.y,
							rx: 0,
							ry: 0,
							stroke: $('#room_drawingColor').val(),
							'stroke-width': 2,
							fill: 'none'
						});
						break;
				}
			}
		}
		drawingCanvas.node.onmousemove = function(e) {
			if (isMouseDown) {
				pointTo = {x: e.layerX, y: e.layerY};
				switch (drawingCanvasStyle) {
					case "pencil":
						drawingCanvasTmpElement.attr('points', drawingCanvasTmpElement.attr('points') + ' ' + pointTo.x + ',' + pointTo.y);
						break;
					case "line":
						drawingCanvasTmpElement.attr({
							x2: pointTo.x,
							y2: pointTo.y,
						});
						break;
					case "rect":
					case "rect_o":
						drawingCanvasTmpElement.attr({
							x: Math.min(pointFrom.x, pointTo.x),
							y: Math.min(pointFrom.y, pointTo.y),
							width: Math.abs(pointFrom.x - pointTo.x),
							height: Math.abs(pointFrom.y - pointTo.y)
						});
						break;
					case "ellipse":
					case "ellipse_o":
						drawingCanvasTmpElement.attr({
							cx: (pointFrom.x + pointTo.x) / 2,
							cy: (pointFrom.y + pointTo.y) / 2,
							rx: Math.abs(pointFrom.x - pointTo.x) / 2,
							ry: Math.abs(pointFrom.y - pointTo.y) / 2
						});
						break;
				}
			}
		}
		drawingCanvas.node.onmouseup = function(e) {
			isMouseDown = false;
			svgFileReader.readAsDataURL((new Blob(
				[(new XMLSerializer).serializeToString(drawingCanvas.node)],
				{type: 'image/svg+xml'}
			)));
		}
		$('#room_drawingCanvasUndo').click(function() {
			if (drawingCanvasStepCount >= 0) {
				SVG.get('step_' + drawingCanvasStepCount).remove();
				drawingCanvasStepCount--;
				svgFileReader.readAsDataURL((new Blob(
					[(new XMLSerializer).serializeToString(drawingCanvas.node)],
					{type: 'image/svg+xml;charset=utf-8'}
				)));
			}
		});
		$('#room_drawingCanvasClean').click(function() {
			socket.emit('setDisplayState', {
				room: room.id,
				state: '#room_drawingCanvasDisplayArea',
				option: true
			});
			loadDrawingCanvas(true);
		});
	}
	socket.emit('setDisplayState', {
		room: room.id,
		state: '#room_drawingCanvasDisplayArea',
		option: $('#room_cleanCanvas').prop('checked')
	});
	loadDrawingCanvas($('#room_cleanCanvas').prop('checked'));
	$('#room_setDrawingCanvas').modal('hide');
});

$('#room_setDrawingCanvas').on('show.bs.modal', function () {
	/* Reset to default */
	$('#room_cleanCanvas').prop('checked', false);
});

/* Work about showing PDF slide */
function convertDataURIToBinary(dataURI) {
	var BASE64_MARKER = ';base64,';
	var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
	var base64 = dataURI.substring(base64Index);
	var raw = window.atob(base64);
	var rawLength = raw.length;
	var array = new Uint8Array(new ArrayBuffer(rawLength));
	for(i = 0; i < rawLength; i++) { array[i] = raw.charCodeAt(i); };
	return array;
}

// Initialize PDFJS
PDFJS.disableWorker = true;
var pdfDoc = null;
var pdfPageNum = 1;
var pdfScale = 1;
var pdfCanvas = document.getElementById('room_pdfCanvas');
var PdfContext = pdfCanvas.getContext('2d');

// Rendering PDF
function renderPdfNstPage(num) {
	pdfDoc.getPage(num).then(function(page) {
		var viewport = page.getViewport(1);
		pdfScale = pdfCanvas.height / viewport.height;
		viewport = page.getViewport(pdfScale);
		page.render({canvasContext: PdfContext, viewport: viewport});
	});
	if (room.speaker == myself.name) socket.emit('setPdfPage',{room: room.id, pageNum: num});
	$('#room_loadPdfNowPage').val(pdfPageNum);
}

// binding PDF button-bar's button
$('#room_loadPdfFirstPage').click(function() {
	pdfPageNum = 1;
	renderPdfNstPage(pdfPageNum);
});
$('#room_loadPdfPrevPage').click(function() {
	if (pdfPageNum <= 1) return 1;
	pdfPageNum--;
	renderPdfNstPage(pdfPageNum);
});
$('#room_loadPdfNextPage').click(function() {
	if (pdfPageNum >= pdfDoc.numPages) return 1;
	pdfPageNum++;
	renderPdfNstPage(pdfPageNum);
});
$('#room_loadPdfLastPage').click(function() {
	pdfPageNum = pdfDoc.numPages;
	renderPdfNstPage(pdfPageNum);
});
$('#room_getPdfNstPage').click(function() {
	pdfPageNum = parseInt($('#room_loadPdfNowPage').val());
	renderPdfNstPage(pdfPageNum);
});

function loadPdf(dataURL, filename) {
	if (filename == "") filename = "slide.pdf" ;
	$('#room_PDFDataURL').prop('href', dataURL);
	$('#room_PDFDataURL').prop('download', filename);
	pdfCanvas.width = $('#room_main').width();
	pdfCanvas.height = $('#room_main').height() - $('#room_pdfNavBar').outerHeight(true) - 35;
	// Rendering PDF
	PDFJS.getDocument(convertDataURIToBinary(dataURL)).then(function(_pdfDoc) {
		pdfDoc = _pdfDoc;
		document.getElementById('room_loadPdfTotlePages').textContent = pdfDoc.numPages;
		renderPdfNstPage(pdfPageNum);
	});
	showDisplayArea('#room_pdfDisplayArea');
}

$('#room_loadPDF').click(function() {
	// ToDo: Check need to load pdf or just show the pdf already load before.
	pdf = $('#room_inputPDF').get(0).files[0];
	pdfFileReader = new FileReader();
	pdfFileReader.readAsDataURL(pdf);
	// Check PDF file is already loaded before doing anything.
	pdfFileReader.onloadend = function() {
		socket.emit('setDisplayState', {
			room: room.id,
			state: '#room_pdfDisplayArea',
			option: {dataurl: pdfFileReader.result, filename: pdf.name}
		});
		loadPdf(pdfFileReader.result, pdf.name);
		$('#room_setPDF').modal('hide');
	}
	if (pdf == null) { $('#room_inputPDF').parent().addClass('has-error'); }
});

$('#room_setPDF').on('show.bs.modal', function () {
	/* Reset to default */
	$('#room_inputPDF').val("");
	$('#room_inputPDF').parent().removeClass('has-error');
});

/* Work about showing YouTube Video */
var youtubePlayer;

function syncYoutubeStateChange(event) {
	if (room.speaker == myself.name) socket.emit('setYoutubeSync', {
		room: room.id,
		state: youtubePlayer.getPlayerState(),
		time: youtubePlayer.getCurrentTime()
	});
	console.log(youtubePlayer.getPlayerState().toString() + ' - ' + youtubePlayer.getCurrentTime().toString());
}

function loadYoutubeVideo(youtubeID, playOnReady) {
	if (youtubePlayer) {
		youtubePlayer.destroy();
	}
	youtubePlayer_width = $('#room_main').width();
	youtubePlayer_height = Math.round((youtubePlayer_width / 16) * 9);
	youtubePlayer = new YT.Player('room_youtubePlayer', {
		height: youtubePlayer_height,
		width: youtubePlayer_width,
		videoId: youtubeID,
		events: {
			'onReady': function(event) {
				if (playOnReady) youtubePlayer.playVideo();
			},
			'onStateChange': syncYoutubeStateChange
		}
	});
	$('#room_displayYoutubeURL').val('http://youtu.be/' + youtubeID);
	$('#room_displayYoutubeURL').click(function(){ this.select(); });
	showDisplayArea('#room_youtubeDisplayArea');
	//console.log("sending message..." + $('#room_inputTextMsg').val());
}

$('#room_loadYoutubeVideo').click(function() {
	re = /(youtu\.be\/|v[=\/])[a-zA-Z0-9_-]{11}/g;
	if (re.test($('#room_inputYoutubeURL').val())) {
		videoId = $('#room_inputYoutubeURL').val().match(re)[0].slice(-11);
		//console.log(videoId);
		socket.emit('setDisplayState', {
			room: room.id,
			state: '#room_youtubeDisplayArea',
			option: {id: videoId, playOnReady: $('#room_playOnReady').prop('checked')}
		});
		loadYoutubeVideo(videoId, $('#room_playOnReady').prop('checked'));
		$('#room_setYoutubePlayer').modal('hide');
	} else{
		$('#room_inputYoutubeURL').parent().addClass('has-error');
		return 1;
	};
});

$('#room_setYoutubePlayer').on('show.bs.modal', function () {
	/* Reset to default */
	$('#room_inputYoutubeURL').val("");
	$('#room_inputYoutubeURL').parent().removeClass('has-error');
	$('#room_playOnReady').prop('checked', false);
});

/* Work about text messages */
insertTextMsg = function (sender, textMsg) {
	extraClass = "";
	if (sender == "System") { extraClass += " room_sysMsg"; }
	if (sender == myself.name) { extraClass += " room_selfTextMsg"; }
	$('#room_textMsgDisplayArea ul').append(
		"<li class=\"thumbnail room_textMsg" + extraClass + "\">" + 
		"<span class=\"room_userName\">" + sender + "</span>: " + textMsg + 
		"</li>"
	);
	$('#room_textMsgDisplayArea').scrollTop($('#room_textMsgDisplayArea ul').height());
}

$('#room_sendTextMsg').click(function() {
	insertTextMsg(myself.name, $('#room_inputTextMsg').val());
	// Do something for Send msg to server
	socket.emit('textMsg', {user: myself.name, room: room.id, msg: $('#room_inputTextMsg').val()});
	$('#room_inputTextMsg').val("");
	//console.log("sending message..." + $('#room_inputTextMsg').val());
});