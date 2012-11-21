/*
Copyright (c) 2010, Martin Wengenmayer ( www.cheetah3d.com )
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are 
permitted provided that the following conditions are met:

-Redistributions of source code must retain the above copyright notice, this list of 
conditions and the following disclaimer. 

-Redistributions in binary form must reproduce the above copyright notice, this list 
of conditions and the following disclaimer in the dation and/or other materials 
provided with the distribution. 

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS 
OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY 
AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER 
OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON 
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE 
OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
POSSIBILITY OF SUCH DAMAGE.
*/

(function ($, undefined) {

const w = window,
	m = w.Math,
	d = w.document;
const 	FPS = 30;
const	DEG2RAD=m.PI/180.0;

//Canvas to which to draw the panorama
var		pano_canvas=null;
 
//Event state
var		mouseIsDown=false;
var		mouseDownPosLastX=0;
var		mouseDownPosLastY=0;
var		displayInfo=true;
//var		highquality=true;

//Camera state
var		cam_heading=90.0;
var		cam_pitch=90.0;
var 	cam_fov=90;



//Load image 
var img_buffer=null;
var img = new Image();	

	var 
	_setTimeout = function (fx, delay) {
		var
			frm = w.requestAnimationFrame || w.mozRequestAnimationFrame ||  
				w.webkitRequestAnimationFrame || w.msRequestAnimationFrame ||
				w.oRequestAnimationFrame || w.setTimeout;

		return frm(fx, frm !== w.setTimeout ? pano_canvas : delay);
	},

	_clearTimeout = function (timeout) {
		var w = w,
			frm = w.cancelAnimationFrame || w.webkitCancelRequestAnimationFrame ||
				w.mozCancelRequestAnimationFrame || w.oCancelRequestAnimationFrame ||
				w.msCancelRequestAnimationFrame  || w.clearTimeout;

		return frm(timeout);
	},
	
	_drawFrm = null,
	
	_startDraw = function () {
		if (!_drawFrm) {
			_drawFrm = _setTimeout(function () {
				draw();
				_drawFrm = null;
				_startDraw();
			}, 50);
		}
	},
	
	_stopDraw = function () {
		_clearTimeout(_drawFrm);
		_drawFrm = null;
	},
	
	imageLoaded = function (){
		var   buffer = d.createElement("canvas");
		var   buffer_ctx = buffer.getContext ("2d");
		
		//set buffer size
		buffer.width = img.width;
		buffer.height = img.height;
	 	
	 	//draw image
		buffer_ctx.drawImage(img,0,0);
	 		
	 	//get pixels
	 	var buffer_imgdata = buffer_ctx.getImageData(0, 0,buffer.width,buffer.height);
	 	var buffer_pixels = buffer_imgdata.data;
	 	
	 	// destroy canvas
	 	//d.removeChild(buffer);
	 	buffer_ctx = null;
	 	buffer_imgdata = null;
	 		
	 	//convert imgdata to float image buffer
	 	img_buffer = new Array(img.width*img.height*3);
	 	for(var i=0,j=0;i<buffer_pixels.length;i+=4, j+=3){
			img_buffer[j] 	= buffer_pixels[i];
			img_buffer[j+1] = buffer_pixels[i+1];
			img_buffer[j+2] = buffer_pixels[i+2];
		}
		
		// free RAM
		buffer_pixels = null;
		
		init_vars();
		
		// initial draw
		draw();
		//setInterval(draw, 1000/FPS);	
	},

 	ctx,
	imgdata,
	src_width,
	src_height,
	dest_width,
	dest_height,
	theta_fac,
	phi_fac,
	
	init_vars = function () {
		// init our private vars
		ctx = pano_canvas.getContext("2d");
		imgdata = ctx.getImageData(0, 0,canvas.width,canvas.height);
		src_width=img.width;
		src_height=img.height;
		dest_width=pano_canvas.width;
		dest_height=pano_canvas.height;
		theta_fac=src_height/m.PI;
		phi_fac=src_width*0.5/m.PI;
		mouseDownPosLastY = dest_height/2;
		mouseDownPosLastX = dest_width/2;
	},

	init_pano = function (canvasid) {
		//get canvas and set up call backs
		pano_canvas = d.getElementById(canvasid);
		pano_canvas.onmousedown = mouseDown;
		w.onmousemove = mouseMove;
		w.onmouseup = mouseUp;
		//w.onmousewheel = mouseScroll;
		w.onkeydown = keyDown;
		
		// load img
		img.onload = imageLoaded;
		img.src = '../img/pano.jpg';
	},

	/*** MOUSE ***/
	
	mouseDown = function (e){
		mouseIsDown=true;
		mouseDownPosLastX=e.clientX;
		mouseDownPosLastY=e.clientY;
	},

	mouseMove = function (e){
		if(!!mouseIsDown){
			cam_heading-=(e.clientX-mouseDownPosLastX);
			cam_pitch+=0.5*(e.clientY-mouseDownPosLastY);
			cam_pitch=m.min(180,m.max(0,cam_pitch));
			mouseDownPosLastX=e.clientX;
			mouseDownPosLastY=e.clientY;	
			_startDraw();
		}
	},

	mouseUp = function (e){
		mouseIsDown=false;
		//_startDraw();
		_stopDraw();
	},

	mouseScroll = function (e){
		cam_fov+=e.wheelDelta/120;
		cam_fov=m.min(90,m.max(30,cam_fov));
		_startDraw();
	},

	/** KEYBOARDS **/
	keyDown  = function (e){
		if(e.keyCode==73){	//i==73 Info
			displayInfo = !displayInfo;
			draw();
		}
	},


	/** RENDER **/

	renderPanorama = function (canvas){
		//if(canvas!=null && img_buffer!=null){
			
			var pixels = imgdata.data;
		
			
			
			//calculate camera plane
			
			var ratioUp=2.0*m.tan(cam_fov*DEG2RAD/2.0);
			var ratioRight=ratioUp*1.33;
			var camDirX=m.sin(cam_pitch*DEG2RAD)*m.sin(cam_heading*DEG2RAD);
			var camDirY=m.cos(cam_pitch*DEG2RAD);
			var camDirZ=m.sin(cam_pitch*DEG2RAD)*m.cos(cam_heading*DEG2RAD);
			var camUpX=ratioUp*m.sin((cam_pitch-90.0)*DEG2RAD)*m.sin(cam_heading*DEG2RAD);
			var camUpY=ratioUp*m.cos((cam_pitch-90.0)*DEG2RAD);
			var camUpZ=ratioUp*m.sin((cam_pitch-90.0)*DEG2RAD)*m.cos(cam_heading*DEG2RAD);
			var camRightX=ratioRight*m.sin((cam_heading-90.0)*DEG2RAD);
			var camRightY=0.0;
			var camRightZ=ratioRight*m.cos((cam_heading-90.0)*DEG2RAD);
			var camPlaneOriginX=camDirX + 0.5*camUpX - 0.5*camRightX;
			var camPlaneOriginY=camDirY + 0.5*camUpY - 0.5*camRightY;
			var camPlaneOriginZ=camDirZ + 0.5*camUpZ - 0.5*camRightZ;
			
			//render image
			var	i,j;
			for(i=0;i<dest_height;i++){
				for(j=0;j<dest_width;j++){
					var	fx=j/dest_width;
					var	fy=i/dest_height;
					
					var	rayX=camPlaneOriginX + fx*camRightX - fy*camUpX;
					var	rayY=camPlaneOriginY + fx*camRightY - fy*camUpY;
					var	rayZ=camPlaneOriginZ + fx*camRightZ - fy*camUpZ;
					var	rayNorm=1.0/m.sqrt(rayX*rayX + rayY*rayY + rayZ*rayZ);
					
					var	theta=m.acos(rayY*rayNorm);
	    			var	phi=m.atan2(rayZ,rayX) + m.PI;
	    			var	theta_i=m.floor(theta_fac*theta);
	    			var	phi_i=m.floor(phi_fac*phi);
	    			
	    			var	dest_offset=4*(i*dest_width+j);
					var	src_offset=3*(theta_i*src_width + phi_i);
					
					pixels[dest_offset]     = img_buffer[src_offset];
					pixels[dest_offset+1]   = img_buffer[src_offset+1];
					pixels[dest_offset+2]   = img_buffer[src_offset+2];
					//pixels[dest_offset+3] = img_buffer[src_offset+3];
				}
			}
	 		
	 		//upload image data
	 		ctx.putImageData(imgdata, 0, 0);
		//}
	},


	drawRoundedRect = function (ctx,ox,oy,w,h,radius){
		ctx.beginPath();
		ctx.moveTo(ox + radius,oy);
		ctx.lineTo(ox + w - radius,oy);
		ctx.arc(ox +w-radius,oy+ radius, radius,-m.PI/2,0, false);
		ctx.lineTo(ox + w,oy + h - radius);
		ctx.arc(ox +w-radius,oy + h - radius, radius,0,m.PI/2, false);
		ctx.lineTo(ox + radius,oy + h);
		ctx.arc(ox + radius,oy + h - radius, radius,m.PI/2,m.PI, false);
		ctx.lineTo(ox,oy + radius);
		ctx.arc(ox + radius,oy + radius, radius,m.PI,3*m.PI/2, false);
		ctx.fill();	
	},


	draw = function (){
	    //if(pano_canvas!=null && pano_canvas.getContext!=null){
	    	//var ctx = pano_canvas.getContext("2d");
	    	
	    	//clear canvas
	    	ctx.fillStyle = "rgba(0, 0, 0, 1)";
	    	ctx.fillRect(0,0,src_width,src_height);
				
			//render paromana direct
			var startTime = new Date();
				renderPanorama(pano_canvas);
			var endTime = new Date();
			
			//draw info text
			if(!!displayInfo){	
				ctx.fillStyle = "rgba(255,255,255,0.75)";
				drawRoundedRect(ctx,20,src_height-80,180,60,7);
				
				ctx.fillStyle = "rgba(0, 0, 0, 1)";
				ctx.font="10pt helvetica";
				ctx.fillText("Canvas = " +  src_width + "x" + src_height,30,pano_canvas.height-60);
				ctx.fillText("Image size = " + img.width + "x" + img.height,30,pano_canvas.height-45);
				ctx.fillText("FPS = " + (1000.0/(endTime.getTime()-startTime.getTime())).toFixed(1),30,pano_canvas.height-30);
			}
	    //}
	};
   
   // @todo: remove
   window.init_pano = init_pano;
   
})(jQuery);