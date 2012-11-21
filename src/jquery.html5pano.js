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
	
"use strict";

var w = window,
	m = w.Math,
	d = w.document,
	DEG2RAD=m.PI/180.0,
	PION2=m.PI/2.0,
	
	// request animation frame
	raf = null,
	craf = null,
	
	_setTimeout = function (fx, canvas, delay) {
		raf = raf || w.requestAnimationFrame || w.mozRequestAnimationFrame ||  
				w.webkitRequestAnimationFrame || w.msRequestAnimationFrame ||
				w.oRequestAnimationFrame || w.setTimeout;

		return raf(fx, raf !== w.setTimeout ? canvas : delay);
	},

	_clearTimeout = function (timeout) {
		craf = craf || w.cancelAnimationFrame || w.webkitCancelRequestAnimationFrame ||
				w.mozCancelRequestAnimationFrame || w.oCancelRequestAnimationFrame ||
				w.msCancelRequestAnimationFrame  || w.clearTimeout;

		return craf(timeout);
	},

	_createPano = function () {
		var
		
		//Canvas to which to draw the panorama
		pano_canvas=null,
	 
		//Event state
		mouseIsDown=false,
		mouseDownPosLastX=0,
		mouseDownPosLastY=0,
		displayInfo=false,
	//	highquality=true,
	
		//Camera state
		cam_heading=90.0,
		cam_pitch=90.0,
		cam_fov=90.0,
		
		// Image 
		img_buffer=null,
	
		_drawFrm = null,
		
		_startDraw = function () {
			if (!_drawFrm) {
				_drawFrm = _setTimeout(function _drawCallback () {
					draw();
					if (!!_drawFrm) {
						_drawFrm = null;
						_startDraw();
					}
				}, pano_canvas, 50);
			}
		},
		
		_stopDraw = function () {
			_clearTimeout(_drawFrm);
			_drawFrm = null;
		},
		
		ctx,
		
		src_width,
		src_height,
		src_ratio,
		
		dest_width,
		dest_height,
		dest_ratio,
		//dest_size,
		
		theta_fac,
		phi_fac,
		
		_init_vars = function (img) {
			// init our private vars
			src_width=img.width;
			src_height=img.height;
			src_ratio=src_width/src_height;
			
			dest_width=pano_canvas.width;
			dest_height=pano_canvas.height;
			dest_ratio=dest_width/dest_height;
			//dest_size=dest_width*dest_height;
			
			ctx = pano_canvas.getContext("2d");
			
			theta_fac=src_height/m.PI;
			phi_fac=src_width*0.5/m.PI;
			
			mouseDownPosLastY = dest_height/2;
			mouseDownPosLastX = dest_width/2;
		},
		
		_fillImgBuffer = function (img) {
			var buffer = d.createElement("canvas"),
				buffer_ctx = buffer.getContext ("2d");
			
			//set buffer size
			buffer.width = img.width;
			buffer.height = img.height;
		 	
		 	//draw image
			buffer_ctx.drawImage(img,0,0);
		 		
		 	//get pixels
		 	var buffer_imgdata = buffer_ctx.getImageData(0, 0, buffer.width, buffer.height),
		 		buffer_pixels = buffer_imgdata.data;
		 		
		 	//convert imgdata to float image buffer
		 	img_buffer = new Array(img.width * img.height * 3);
		 	for(var i=0,j=0,l=buffer_pixels.length; i<l; i+=2, j++){
				img_buffer[j++] = buffer_pixels[i++];
				img_buffer[j++] = buffer_pixels[i++];
				img_buffer[j] = buffer_pixels[i];
			}
		},
	
		_init_pano = function (c, options) {
			if (!options || !options.src) {
				console.error('No image found');
				return;	
			}
			if (options.debug===true) {
   				displayInfo = options.debug;
   			}
			
			//get canvas and set up call backs
			pano_canvas = c; //d.getElementById(canvasid);
			//pano_canvas.onmousedown = mouseDown;
			//pano_canvas.onmousemove = mouseMove;
			//pano_canvas.onmouseup = mouseUp;
			//pano_canvas.onmousewheel = mouseScroll;
			$(c).mousedown(mouseDown)
				.mouseup(mouseUp)
				.mousemove(mouseMove)
				.on('mousewheel', mouseScroll);
				
			//w.onkeydown = keyDown;
			$(d).keydown(keyDown);
			
			// load img
			// use local variable here. this will permet
			// garbage collecting
			var img = new Image();
			$(img).load(function _imgLoaded () {
				_fillImgBuffer(img);
				_init_vars(img);
				// initial draw, one frame
				draw();	
			});
			img.src = options.src;
		},
	
		/*** MOUSE ***/
		
		mouseDown = function (e){
			mouseIsDown = true;
			mouseDownPosLastX = e.clientX;
			mouseDownPosLastY = e.clientY;
		},
	
		mouseMove = function (e){
			if(!!mouseIsDown){
				var cx = e.clientX,
					cy = e.clientY;
					
				e.stopPropagation();
				
				cam_heading-= (cx-mouseDownPosLastX);
				cam_pitch += 0.5*(cy-mouseDownPosLastY);
				cam_pitch=m.min(180,m.max(0,cam_pitch));
				
				mouseDownPosLastX = cx;
				mouseDownPosLastY = cy;
				
				_startDraw();
			}
		},
	
		mouseUp = function (e){
			mouseIsDown = false;
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
	
		_renderPanorama = function () {
				
			var 
			imgdata = ctx.getImageData(0, 0, dest_width, dest_height),
			pixels = imgdata.data,
			
			cam_fov_rad = cam_fov*DEG2RAD,
			
			cam_pitch_rad = cam_pitch*DEG2RAD,
			cam_pitch_sin = m.sin(cam_pitch_rad),
			
			cam_pitch_rad_inv = (cam_pitch-90.0)*DEG2RAD,
			cam_pitch_sin_inv = m.sin(cam_pitch_rad_inv),
			
			cam_heading_rad = cam_heading*DEG2RAD,
			cam_heading_sin = m.sin(cam_heading_rad),
			cam_heading_cos = m.cos(cam_heading_rad),
			
			cam_heading_rad_inv = (cam_heading-90.0)*DEG2RAD,
			
			//calculate camera plane
			ratioUp=src_ratio*m.tan(cam_fov_rad/2.0),
			ratioRight=ratioUp*dest_ratio,
			
			camDirX=cam_pitch_sin*cam_heading_sin,
			camDirY=m.cos(cam_pitch_rad),
			camDirZ=cam_pitch_sin*cam_heading_cos,
			
			camUpX=ratioUp*cam_pitch_sin_inv*cam_heading_sin,
			camUpY=ratioUp*m.cos(cam_pitch_rad_inv),
			camUpZ=ratioUp*cam_pitch_sin_inv*cam_heading_cos,
			
			camRightX=ratioRight*m.sin(cam_heading_rad_inv),
			camRightY=0.0,
			camRightZ=ratioRight*m.cos(cam_heading_rad_inv),
			
			camPlaneOriginX=camDirX + 0.5*camUpX - 0.5*camRightX,
			camPlaneOriginY=camDirY + 0.5*camUpY - 0.5*camRightY,
			camPlaneOriginZ=camDirZ + 0.5*camUpZ - 0.5*camRightZ,
			
			i = 0, j = 0;
			
			//render image
			for(i=0;i<dest_height;i++){
				var offset = i*dest_width;
				for(j=0;j<dest_width;j++){
				/*
				THIS IS WORST
				for (var x=0;x<dest_size;x++) {
					i = ~~(x / dest_width);
					j = x % dest_width; */
					
					var	
					fx=j/dest_width,
					fy=i/dest_height,
					
					rayX=camPlaneOriginX + fx*camRightX - fy*camUpX,
					rayY=camPlaneOriginY + fx*camRightY - fy*camUpY,
					rayZ=camPlaneOriginZ + fx*camRightZ - fy*camUpZ,
					rayNorm=1.0/m.sqrt(rayX*rayX + rayY*rayY + rayZ*rayZ),
					
					theta=m.acos(rayY*rayNorm),
	    			phi=m.atan2(rayZ,rayX) + m.PI,
	    			
	    			theta_i=~~(theta_fac * theta),
	    			phi_i=~~(phi_fac * phi),
	    			
	    			dest_offset=4*(offset + j), // x
					src_offset=3*((theta_i * src_width) + phi_i);
					
					pixels[dest_offset++]   = img_buffer[src_offset++];
					pixels[dest_offset++]   = img_buffer[src_offset++];
					pixels[dest_offset]   = img_buffer[src_offset];
					//pixels[dest_offset+3] = img_buffer[src_offset+3];
				}
			}
		 		
		 	//upload image data
		 	ctx.putImageData(imgdata, 0, 0);
		},
	
	
		_drawRoundedRect = function (ctx,ox,oy,width,height,radius){
			ctx.beginPath();
			ctx.moveTo(ox + radius,oy);
			ctx.lineTo(ox + width - radius,oy);
			ctx.arc(ox + width-radius,oy + radius, radius,-PION2,0, false);
			ctx.lineTo(ox + w,oy + height - radius);
			ctx.arc(ox + width-radius,oy + height - radius, radius,0,PION2, false);
			ctx.lineTo(ox + radius,oy + height);
			ctx.arc(ox + radius,oy + height - radius, radius,PION2,m.PI, false);
			ctx.lineTo(ox,oy + radius);
			ctx.arc(ox + radius,oy + radius, radius,m.PI,3*PION2, false);
			ctx.fill();	
		},
	
	
		draw = function (){
			var startTime = $.now();
			
	    	//clear canvas
	    	//ctx.fillStyle = "rgba(0, 0, 0, 1)";
	    	ctx.fillRect(0,0,src_width,src_height);
			
			// not working
			//ctx.clearRect(0,0,src_width,src_height);
				
			//render paromana direct
			_renderPanorama();
			
			//draw info text
			if(!!displayInfo){	
				
				var endTime = $.now(),
					lastRender = endTime-startTime;
				
				ctx.fillStyle = "rgba(255,255,255,0.75)";
				_drawRoundedRect(ctx,20,dest_height-80,180,60,7);
				
				ctx.fillStyle = "rgba(0, 0, 0, 1)";
				ctx.font="11px consolas, monosapce";
				ctx.fillText("Canvas: " +  dest_width + "x" + dest_height + " " + dest_ratio.toFixed(3), 30,dest_height-60);
				ctx.fillText("Image size: " + src_width + "x" + src_height + " " + src_ratio.toFixed(3), 30,dest_height-45);
				ctx.fillText("FPS: " + (1000.0/lastRender).toFixed(1) + " (" + lastRender + ")",         30,dest_height-30);
			
				//console.log(lastRender);
			}
		};
	
		return {
			init: _init_pano,
			draw: draw	
		};
	};
   
   // jquery plugin
   $.fn.extend({
   		panorama: function (options) {
   			var t = $(this);
   			
   			return t.each(function _eachPanorama() {
   				_createPano().init(this, options);
   			});	
   		}
   	});
   
})(jQuery);