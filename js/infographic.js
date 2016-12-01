"use strict";

var game_entry;
var game_shortcut;
var game_start_button;
var game_form;
var game_player_name;
var game_preloader;
var preload_marker;
var preload_bar;
var preload_width;
var hud;
var gl_canvas;
var onyx_bg;
var replay_button;
var game_over_screen;
var blue_road;
var road_path;
var scroll_car;
var scroll_position;
var last_scroll_position = 0;
var road_top;
var road_start;
var road_end;
var info_points = [];
var lerps = [0,0,0,0,0,0,0,0];
var sharing;

window.addEventListener("load", info_graphic_init, false);

// requestAnimationFrame fix for IE9
(function() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

var InfoIcon = function()
{
	this.icon;
	this.header;
	this.text;
}

function info_graphic_init()
{
	game_entry = document.querySelector('.game-entry');
	game_shortcut = document.querySelector('.game-shortcut');
	game_shortcut.addEventListener('click', on_game_shortcut);
	game_player_name = document.querySelector('#game-player-name');

	if (game_player_name !== null) {
		game_player_name.addEventListener('keypress', function(e){
			if (e.keyCode == 13) {
				on_game_start_press();
			}
		});
	}
	game_start_button = document.querySelector('.game-start-button');
	if (game_start_button !== null) {
		game_start_button.addEventListener('click', on_game_start_press);
	}
	game_form = document.querySelector('.game-form');
	game_preloader = document.querySelector('.game-preloader');
	preload_marker = document.querySelector('.preload-marker');
	preload_bar = document.querySelector('.preload-bar');
	game_over_screen = document.querySelector('.game-over-screen');
	onyx_bg = document.querySelector('.onyx');
	hud = document.querySelector('.hud');
	replay_button = document.querySelector('.play-again-button');
	replay_button.addEventListener('click', on_replay);

	sharing = document.querySelector('.sharing');

	blue_road = document.querySelector('.blue-road');
	road_path = document.getElementById('road-path-target');
	scroll_car = document.querySelector('.scroll-car');

	var info_elements = document.querySelectorAll('.info-point');

	var n = info_elements.length;
	for(var i = 0; i < n; ++i)
	{
		var element = info_elements[i];
		var icon = new InfoIcon();
		icon.icon = element.querySelector('.info-icon');
		icon.header = element.querySelector('h3');
		icon.text = element.querySelector('p');
		
		icon.icon.style.opacity = 0;
		icon.icon.style.transform = "scale(0,0)";
		icon.header.style.opacity = 0;
		icon.text.style.opacity = 0;

		info_points.push(icon);

	}
	window.addEventListener('scroll', on_scroll, false);

	road_start = road_path.getPointAtLength(0);
	road_end = road_start + road_path.getTotalLength();

	preload_width = 0;
	game_over_screen = document.querySelector('.game-over-screen');

	var win_width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
	if(win_width < 1000)
	{
		game_entry.classList.add('inactive');
	}


	requestAnimationFrame(info_upA);
}

function on_game_start_press()
{
	game_start_button.removeEventListener('click', on_game_start_press);
	game_form.classList.remove('visible');
	game_preloader.classList.add('visible');

	blue_road.classList.remove('visible');

	var onyx_container = document.querySelector('.onyx');
    onyx = new Onyx(onyx_container);
    if(onyx.success)
    {
        onyx.resources.preload('resources.json', load_complete, load_progress);
    }
}

function load_progress(percent)
{
    preload_marker.style.width = percent + '%';
}

function load_complete()
{
	preload_marker.style.width = 100 + '%';
	game_preloader.classList.remove('visible');
	onyx_bg.classList.add('active');
	game_entry.classList.add('playing');
	gl_canvas = document.querySelector('.glcanvas');
	gl_canvas.classList.add('active');
	hud.classList.add('visible');
	game_init();
}

function on_game_shortcut()
{
	window.scrollTo(0, 5000);
}

function on_replay()
{
	onyx_bg.classList.add('active');
	game_entry.classList.add('playing');
	gl_canvas.classList.add('active');
	hud.classList.add('visible');
	blue_road.classList.remove('visible');
	game_over_screen.classList.remove('visible');
	sharing.classList.remove('visible');
	game_retry();
}

function on_scroll(e)
{
	if (typeof window.scrollY !== 'undefined') {
		scroll_position = window.scrollY;
	} else {
		scroll_position = document.documentElement.scrollTop;
	}
}

function info_upA(t)
{
	info_update();
    requestAnimationFrame(info_upB);
}

function info_upB(t)
{
	info_update();
    requestAnimationFrame(info_upA);
}


function info_update()
{
	if (scroll_position > 300)
	{
		var t = 0.5;
		var scroll = (1-t) * last_scroll_position + t * scroll_position;
		last_scroll_position = scroll_position;

		if(scroll < 0) scroll = 0;
		
		if(scroll > road_end) 
			scroll = road_end;
		var start = road_start;
		
		var pa = road_path.getPointAtLength(scroll);
		var pb = road_path.getPointAtLength(scroll + 10);

		var vx = pb.x - pa.x;
		var vy = pb.y - pa.y;
		var angle = (Math.atan2(vy, vx) * 57.2957795);
	
		var dx = (pb.x - start.x) + 64;
		var dy = (pb.y - start.y);

		update_transform(scroll_car, 1,1, dx, dy, -angle - 180);

		var start = 30;
		var end = 950;
		for(var i = 0; i < 8; ++i)
		{
			var t = clamp((scroll - start)/(end-start),0,1);
			start += 450;
			end += 450;

			info_points[i].icon.style.opacity = t;
			info_points[i].icon.style.transform = "scale(" + t + "," + t + ")";

			info_points[i].header.style.opacity = cubic_bezier(0, 0, 0.5, 1, t);
			info_points[i].text.style.opacity = cubic_bezier(0, 0, 0, 1, t);
		}
	}
}


function clamp(val, min, max)
{
	if(val < min) return min;
	else if(val > max) return max;
	return val;
}

function cubic_bezier(a,b,c,d, t)
{
    var cy = 3 * (b - a);
    var by = 3 * (c - b) - cy;
    var ay = d - a - cy - by;
	var tt = t * t;
    var ttt = tt * t;
    var r = (ay * ttt) + (by * tt) + (cy * t) + a;
    return r;
}

function update_transform(ent, sx, sy, tx, ty, r)
{
	var ang = r * Consts.DEG2RAD;
	var a = Math.cos(ang);// * sx;
	var b = -Math.sin(ang);
	var c = tx;
	var d = Math.sin(ang);
	var e = Math.cos(ang);// * sy;
	var f = ty;

	var matrix = "matrix("+a+","+b+","+d+","+e+","+c+","+f+")";

	ent.style["webkitTransform"] = matrix;
	ent.style.MozTransform = matrix;
	ent.style["oTransform"] = matrix;
	ent.style["msTransform"] = matrix;
	ent.style["transform"] = matrix;
}
