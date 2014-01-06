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
}

/* Show selected displayer in room_main and hide otherwise */
showDisplayAreas = function(selectedDisplayAreas) {
	//console.log();
	$('#room_main').children().addClass('hidden');
	for (i in selectedDisplayAreas) {
		$(selectedDisplayAreas[i]).removeClass('hidden');
	};
}

/* Work about showing Webcam videos */
//var room = location.search && location.search.split('?')[1];
var room_id = "mow_" + room.id;
var webrtcSessionID;
var webrtc = new SimpleWebRTC({
	localVideoEl: 'room_selfVideo',
	remoteVideosEl: 'room_members',
	autoRequestMedia: true,
	log: true
});
webrtc.on('readyToCall', function () {
	webrtc.joinRoom(room_id);
	webrtcSessionID = webrtc.connection.socket.sessionid;
	console.log(webrtcSessionID);
});

/* Work about showing drawing Canvas */
var drawingCanvas = document.getElementById('room_drawingCanvas');
function loadDrawingCanvas(cleanCanvas) {
	if (cleanCanvas) {};
	// Do something
	showDisplayAreas(['#room_drawingCanvasDisplayArea']);
}

$('#room_loadDrawingCanvas').click(function() {
	drawingCanvas.width = $('#room_main').width();
	drawingCanvas.height = $('#room_main').height() - $('#room_drawingCanvasNavBar').outerHeight(true) - 35;
	// Do something
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
	$('#room_loadPdfNowPage').val(pdfPageNum);
}

// binding PDF button-bar's button
$('#room_loadPdfFirstPage').click(function() {
	pdfPageNum = 1;
	// Do something for sync status
	renderPdfNstPage(pdfPageNum);
});
$('#room_loadPdfPrevPage').click(function() {
	if (pdfPageNum <= 1) return 1;
	pdfPageNum--;
	// Do something for sync status
	renderPdfNstPage(pdfPageNum);
});
$('#room_loadPdfNextPage').click(function() {
	if (pdfPageNum >= pdfDoc.numPages) return 1;
	pdfPageNum++;
	// Do something for sync status
	renderPdfNstPage(pdfPageNum);
});
$('#room_loadPdfLastPage').click(function() {
	pdfPageNum = pdfDoc.numPages;
	// Do something for sync status
	renderPdfNstPage(pdfPageNum);
});
$('#room_getPdfNstPage').click(function() {
	pdfPageNum = parseInt($('#room_loadPdfNowPage').val());
	// Do something for sync status
	renderPdfNstPage(pdfPageNum);
});

function loadPdf(dataURL, filename) {
	if (filename == "") { filename = "slide.pdf"; };
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
	showDisplayAreas(['#room_pdfDisplayArea']);
}

$('#room_loadPDF').click(function() {
	// ToDo: Check need to load pdf or just show the pdf already load before.
	pdf = $('#room_inputPDF').get(0).files[0];
	pdfURL = new FileReader();
	pdfURL.readAsDataURL(pdf);
	// Check PDF file is already loaded before doing anything.
	pdfURL.onloadend = function() {
		//console.log(pdfURL.result);
		// Do something for sync status
		loadPdf(pdfURL.result, pdf.name);
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
	// Do something for send YouTube video player status to server
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
	showDisplayAreas(['#room_youtubeDisplayArea']);
	//console.log("sending message..." + $('#room_inputTextMsg').val());
}

$('#room_loadYoutubeVideo').click(function() {
	re = /(youtu\.be\/|v[=\/])[a-zA-Z0-9_-]{11}/g;
	if (re.test($('#room_inputYoutubeURL').val())) {
		videoId = $('#room_inputYoutubeURL').val().match(re)[0].slice(-11);
		//console.log(videoId);
		// Do something for send YouTube video to server
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
function insertTextMsg (sender, textMsg) {
	extraClass = "";
	if (sender == "Admin") { extraClass += " room_selfTextMsg"; }
	$('#room_textMsgDisplayArea ul').append(
		"<li class=\"thumbnail room_textMsg" + extraClass + "\">" + 
		"<span class=\"room_userName\">" + sender + "</span>: " + textMsg + 
		"</li>"
	);
	$('#room_textMsgDisplayArea').scrollTop($('#room_textMsgDisplayArea ul').height());
}

$('#room_sendTextMsg').click(function() {
	insertTextMsg("Admin", $('#room_inputTextMsg').val());
	// Do something for Send msg to server
	$('#room_inputTextMsg').val("");
	//console.log("sending message..." + $('#room_inputTextMsg').val());
});