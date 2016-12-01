'use strict';
var paused;
var has_focus;

var bg_cam;
var refl_cam;
var fg_cam;
var gui_cam;

var ground = [];
var num_ground = 3;
var car;
var car_body;
var headlights;
var wheels = [];
var lights = [];
var num_trees = 8;
var trees_left = [];
var trees_right = [];
var hedges = [];
var obstacles = [];
var num_clouds = 20;
var clouds = [];
var snow = [];
var smoke_root;
var num_smoke = 20;
var smoke = [];
var smoke_alpha = [];
var particle_root;
var num_particles = 3;
var particles = [];

var car_speed;
var car_accel;
var car_max_speed;
var car_turn_speed;
var car_tilt;
var car_drift;
var car_lurch;
var car_spin;
var car_spin_rate;
var last_pos = new Vec3();
var x_velocity;
var car_h;
var car_bob;
var car_bob_dir;
var car_bob_speed;
var car_brake_strength;
var steering_response;

var dial_r;

var scene_mat;
var vertex_shader;
var refl_shader;

var max_progress = 6000;
var progress_bar;
var progress_marker;
var progress_width;
var num_obstacles;
var obstacle_timer;
var player_name = null;

var score_list;
var score = 0;
var score_display;
var hud_score;
var hud_rank;
var rank = 0;
var init_rank = false;
var total_ranks = 100;
var score_tween;
var hit_timer;
var progress;
var zone;
var zone_blend;
var tree_switch;
var zone_icons;
var game_state;


function game_init()
{
    hud_score = document.querySelector('.hud-score');
    hud_rank = document.querySelector('.hud-rank');

    score_display = document.querySelector('.game-score');
    total_ranks = 100;

    preload_marker.style.width = 100 + '%';

    var textured_shader = Shader.find('textured');
    vertex_shader = Shader.find('vertex');
    refl_shader = Shader.find('reflection');
    var flat_shader = Shader.find('flat');

    var flat_mat = new Material(flat_shader);

    scene_mat = new Material(vertex_shader);

    scene_mat.set_texture('texture', Texture.find('pallet-sunny'), 0);
    scene_mat.set_texture('rainy', Texture.find('pallet-rainy'), 1);
    scene_mat.set_texture('snowy', Texture.find('pallet-snowy'), 2);
    scene_mat.set_texture('tired', Texture.find('pallet-tired'), 3);
    scene_mat.set_vec3('light_dir', Vec3.tmpA.set(0.01,0.707,0.707));
    scene_mat.set_float('light_str', 0.2);
    
    bg_cam = new Camera().perspective(60, 0.1, 150);
    bg_cam.entity.set_posf(0,1.5,4);
    onyx.scene.add_camera(bg_cam);

    refl_cam = new Camera().perspective(60, 0.1, 150);
    refl_cam.entity.set_parent(bg_cam.entity);
    refl_cam.mask = 3;
    refl_cam.color.set(1,1,1,0); 
    onyx.scene.add_camera(refl_cam);
    
    fg_cam = new Camera().perspective(60, 0.1, 150);
    fg_cam.entity.set_parent(bg_cam.entity);
    fg_cam.mask = 3;
    fg_cam.clear_mode = PixelType.DEPTH;
    onyx.scene.add_camera(fg_cam);

    gui_cam = new Camera().ortho(0,10);
    gui_cam.mask = 1;
    gui_cam.clear_mode = PixelType.DEPTH;
    gui_cam.entity.set_posf(0,1,4);
    onyx.scene.add_camera(gui_cam);
    
    var mountains = new Entity();
    mountains.mesh = Mesh.find("mountains");
    mountains.material = scene_mat;
    mountains.set_posf(0,0,-80);
    onyx.scene.add_entity(mountains);

    var road_mesh = Mesh.find("road");
    for(var i = 0; i < num_ground; ++i)
    {
        var gr = new Entity();
        gr.mesh = road_mesh;
        gr.material = scene_mat;
        gr.set_posf(0,0,-76 * i);
        onyx.scene.add_entity(gr);
        ground.push(gr);
    }

    car = new Entity();
    car.set_posf(0,0,0);
    onyx.scene.add_entity(car);

    var car_mesh = Mesh.find('car');
    car_body = new Entity();
    car_body.mesh = car_mesh;
    car_body.draw_layer = 3;
    car_body.material = scene_mat;
    car_body.set_posf(0,0,0);
    car_body.set_parent(car);
    onyx.scene.add_entity(car_body);


    var wheel_mesh = Mesh.find('wheel');
    for(var i = 0; i < 4; ++i)
    {
        var wheel = new Entity();
        wheel.mesh = wheel_mesh;
        wheel.material = scene_mat;
        wheel.set_parent(car);
        wheel.draw_layer = 3;
        wheel.rotatef(0,180,0);
        onyx.scene.add_entity(wheel);
        wheels.push(wheel);
    }
    wheels[0].set_posf(-0.53, 0.2, 0.6);
    wheels[1].set_posf( 0.53, 0.2, 0.6);
    wheels[2].set_posf(-0.53, 0.2, -0.6);
    wheels[3].set_posf( 0.53, 0.2, -0.6);


    var shadow = new Entity();
    shadow.mesh = Mesh.find("car-shadow");
    shadow.material = scene_mat;
    shadow.set_parent(car);
    onyx.scene.add_entity(shadow);

    headlights = new Entity();
    headlights.mesh = Mesh.find("headlights");
    headlights.mesh.set_vertex_alpha(0.4);
    headlights.material = flat_mat;
    headlights.draw_layer = 3;
    headlights.set_parent(car);
    onyx.scene.add_entity(headlights);
    headlights.set_active(false);

    particle_root = new Entity();
    onyx.scene.add_entity(particle_root);

    var particle_mat = new Material(Shader.find('particle'));
    for(var i = 0; i < num_particles; ++i)
    {
        var ii = i + 1;
        var ptcl = new Entity();
        ptcl.mesh = Mesh.find('particles');
        ptcl.material = particle_mat;
        ptcl.mesh.set_vertex_alpha(0.1 * (ii));
        var rx = randf(-1,1);
        ptcl.set_posf(rx, 5.2 * ii, -1 * ii);
        ptcl.set_parent(particle_root);
        onyx.scene.add_entity(ptcl);
        particles.push(ptcl);
    }
    
    for(var i = 0; i < 2; ++i)
    {
        var light = new Entity();
        light.mesh = MeshTools.quad(0.3, 0.3);
        light.material = new Material(textured_shader);
        light.material.set_texture("texture", Texture.find('brakelight'), 0);
        light.draw_layer = 3;
        light.set_parent(car_body);
        onyx.scene.add_entity(light);
        lights.push(light);
    }

    lights[0].set_posf(-0.45, 0.45, 1.01);
    lights[1].set_posf( 0.45, 0.45, 1.01);
        
    
    var tree_mesh = Mesh.find('tree');
    for(var i = 0; i < num_trees; ++i)
    {
        var tree = new Entity();
        tree.mesh = tree_mesh;
        tree.material = scene_mat;
        var rx = randf(-8,-15);
        var rs = randf(0.8, 1.2);
        tree.set_posf(rx,0,-i * 15);
        tree.set_scalef(rs, rs, rs);
        trees_left.push(tree);
        onyx.scene.add_entity(tree);
    }
    for(var i = 0; i < num_trees; ++i)
    {
        var tree = new Entity();
        tree.mesh = tree_mesh;
        tree.material = scene_mat;
        var rx = randf(8,15);
        var rs = randf(0.8, 1.2);
        tree.set_posf(rx,0,-i * 15);
        tree.set_scalef(rs, rs, rs);
        trees_right.push(tree);
        onyx.scene.add_entity(tree);
    }

    num_obstacles = 7;
    var cone_mesh = Mesh.find('cones');
    var van_mesh = Mesh.find('van');
    var truck_mesh = Mesh.find('truck');
    var other_car_mesh = Mesh.find('carother');
    var evans_mesh = Mesh.find('evans');

    for(var i = 0; i < num_obstacles; ++i)
    {
        var obstacle = new Entity();
        obstacle.material = scene_mat;
        obstacle.set_posf(-50,0,-50);
        obstacle.draw_layer = 3;
        obstacles.push(obstacle);
        onyx.scene.add_entity(obstacles[i]);
        obstacles[i].data = {};
    }

    obstacles[0].mesh = cone_mesh;
    obstacles[1].mesh = van_mesh;
    obstacles[2].mesh = truck_mesh;
    obstacles[3].mesh = other_car_mesh;
    obstacles[4].mesh = van_mesh;
    obstacles[5].mesh = other_car_mesh;
    obstacles[6].mesh = evans_mesh;


    obstacles[0].data.bounds = new AABB().setf(3,1,2.5);
    obstacles[1].data.bounds = new AABB().setf(1.8,2.1,3.3);
    obstacles[2].data.bounds = new AABB().setf(2.8,2,6);
    obstacles[3].data.bounds = new AABB().setf(1.8,1,2.5);
    obstacles[4].data.bounds = new AABB().setf(1.8,2.1,3.3);
    obstacles[5].data.bounds = new AABB().setf(1.8,1,2.5);
    obstacles[6].data.bounds = new AABB().setf(1.8,2,2.5);


    obstacles[0].data.speed = -1;
    obstacles[1].data.speed = 0;
    obstacles[2].data.speed = 0;
    obstacles[3].data.speed = -20;
    obstacles[4].data.speed = 0;
    obstacles[5].data.speed = -20;
    obstacles[6].data.speed = -50;


    obstacles[0].data.minx = -0.5;
    obstacles[1].data.minx = -0.5;
    obstacles[2].data.minx = 1;
    obstacles[3].data.minx = -3;
    obstacles[4].data.minx = 0;
    obstacles[5].data.minx = -3;
    obstacles[6].data.minx = 0;


    obstacles[0].data.maxx = 4;
    obstacles[1].data.maxx = 3;
    obstacles[2].data.maxx = 3;
    obstacles[3].data.maxx = -1;
    obstacles[4].data.maxx = 4;
    obstacles[5].data.maxx = -1;
    obstacles[6].data.maxx = 3;


    for(var i = 0; i < num_obstacles; ++i)
    {
        obstacles[i].set_active(false);
    }


    var speedometer_size = onyx.view.width / 4;
    if(speedometer_size > 512) speedometer_size = 512;
    else if(speedometer_size < 256) speedometer_size = 256;

    var speedometer = new Entity();
    speedometer.draw_layer = 1;
    speedometer.mesh = MeshTools.quad(speedometer_size, speedometer_size);
    speedometer.material = new Material(textured_shader);
    speedometer.material.set_texture("texture", Texture.find('speedometer'), 0);
    speedometer.set_posf((onyx.view.width / 2) - (speedometer_size / 2), ((-onyx.view.height / 2) + (speedometer_size/2)), -1);
    onyx.scene.add_entity(speedometer);

    dial_r = new Entity();
    dial_r.set_parent(speedometer);
    onyx.scene.add_entity(dial_r);

    
    var dial = new Entity();
    dial.draw_layer = 1;
    dial.mesh = MeshTools.quad(5, speedometer_size * 0.3);
    dial.mesh.set_vertex_colors(1,0,0,1);
    dial.material = flat_mat;
    dial.set_posf(0, (speedometer_size * 0.15) ,0);
    dial.set_parent(dial_r);
    onyx.scene.add_entity(dial);
    
    dial_r.rotatef(0,0,140);

    speedometer.set_active(true);
    dial.set_active(true);


    var cloud_mesh = Mesh.find('clouds');
    for(var i = 0; i < num_clouds; ++i)
    {
        var cloud = new Entity();
        cloud.mesh = cloud_mesh;
        cloud.material = scene_mat;
        clouds.push(cloud);
        var rx = randf(-10,10);
        var ry = randf(0,2);
        var rz = randf(0, -60);
        var rs = randf(1,1.5);
        cloud.set_posf(rx,ry,rz);
        cloud.set_scalef(rs,rs,rs);
        onyx.scene.add_entity(cloud);
    }

    smoke_root = new Entity();
    smoke_root.set_posf(0,0.5,-1);
    smoke_root.set_parent(car_body);
    onyx.scene.add_entity(smoke_root);
    for(var i = 0; i < num_smoke; ++i)
    {
        var smoke_pt = new Entity();
        smoke_pt.mesh = MeshTools.cube(0.2,0.2,0.2);
        smoke_pt.mesh.set_vertex_colors(0.2,0.2,0.2,1.0);
        var rx = randf(0.0,0.5);
        var ry = randf(0.0,0.5);
        var rz = randf(0.0,0.5);
        smoke_pt.set_posf(rx,ry,rz);
        smoke_pt.set_parent(smoke_root);
        smoke_pt.material = flat_mat;
        smoke.draw_layer = 3;
        onyx.scene.add_entity(smoke_pt);
        smoke.push(smoke_pt);
        smoke_alpha.push(randf(0,1));
    }
    smoke_root.set_active(false);

    score_tween = 0;
    zone = -1;
    hit_timer = 0;
    progress = 0;
    tree_switch = true;
    obstacle_timer = 5.0;
    game_state = -1;

    game_reset();
    start();
}

function start()
{
    player_name = document.getElementById('game-player-name').value;
    console.log(player_name);

    get_score_list();

    window.setTimeout(function()
    {
        game_state = 0;
        onyx.start();
        requestAnimationFrame(upA);
    }, 1.0);
}


function upA(t)
{
    onyx.update(t);
    if(onyx.dt > 0.04)
    {   
        requestAnimationFrame(upB);
        return;
    }
    
    update(t);
    requestAnimationFrame(upB);
}

function upB(t)
{
    onyx.update(t);
    if(onyx.dt > 0.04)
    {   
        requestAnimationFrame(upA);
        return;
    }
    update(t);
    requestAnimationFrame(upA);
}

function update(timestamp)
{
    var dt = onyx.dt;

    if(game_state === 3) return;

    var p;

    // COLLISIONS

    if(game_state === 0)
    {
        for(var i = 0; i < num_obstacles; ++i)
        {
            var obstacle = obstacles[i];
            if(obstacle.active == true)
            {
                if(obstacle.data.bounds.overlaps(car_body.bounds, obstacle.pos, car.pos))
                {
                    car_spin_rate = 200;
                    game_state = 1;
                    x_velocity += 10;
                    for(var j = 0; j < num_obstacles; ++j)
                    {
                        obstacles[i].set_active(false);
                    }
                    smoke_root.set_active(true);
                }
            }
        }
    }

    // CAR MOVEMENT
    p = car.pos;

    // CAM FOLLOW
    //bg_cam.entity.pos.x = Easing.lerp(bg_cam.entity.pos.x, car.pos.x, 3.0 * dt);

    if(game_state != -1)
    {
        car_speed += car_accel * dt;
        if(car_speed > car_max_speed) 
            car_speed = car_max_speed;  
    }
    
    var inv_speed = car_speed / car_max_speed;
    var inv_dial = car_speed / 120;
    var dial_angle = -((-140) + (170 * inv_dial));

    dial_r.set_rotf(0,0,dial_angle);

    x_velocity = (p.x - last_pos.x) / dt;
    last_pos.x = p.x;

    var x_accel = 0;


    if(game_state == 0) //normal
    {
        var left_key = onyx.input.held(KeyCode.A) || onyx.input.held(KeyCode.LEFT);
        var right_key = onyx.input.held(KeyCode.D) || onyx.input.held(KeyCode.RIGHT);
      

        if(left_key)
        {
            x_accel -= car_turn_speed * dt;
            car_speed *= 0.999;
            car_tilt -= 8 * dt;
        }
        else if(right_key)
        {
            x_accel += car_turn_speed * dt;
            car_speed *= 0.999;
            car_tilt += 8 * dt;
        }
        else
        {
            x_velocity *= steering_response;
            car_tilt *= 0.9;
        }

        /*
        if(down_key)
        {
            car_lurch -= 16 * dt;
            if(car_lurch < -8) car_lurch = -8;

            car_speed *= car_brake_strength;
            lights[0].set_scalef(2,2,1);
            lights[1].set_scalef(2,2,2);
        }
        else
        {
            car_lurch *= 0.9;
            lights[0].set_scalef(1,1,1);
            lights[1].set_scalef(1,1,1);
        }
        */

        car_max_speed += 0.4 * dt;
    }
    else if(game_state == 1) //hit
    {
        x_velocity *= 0.9;
        car_tilt *= 0.9;
        car_speed *= 0.98;
        if(car_speed < 0) car_speed = 0;
        car_accel = 0;
        car_spin_rate *= 0.98;
        if(car_spin_rate < 0) car_spin_rate = 0;
        car_spin += car_spin_rate * dt;

        // SMOKE
    
        for(var i = 0; i < num_smoke; ++i)
        {
            var s = smoke[i];
            var alpha = smoke_alpha[i];
            alpha -= 1.0 * dt;

            var rx = randf(0.0,0.5);
            var ry = randf(0.0,0.5);
            var rz = randf(0.0,0.5);

            var scale = 1.0 - alpha;
        
            if(alpha < 0)
            {
                s.set_posf(rx,ry,rz);
                s.set_scalef(0, 0, 0);
                alpha = 1.0;
            }
            else
            {
                s.movef(0, ry * dt, car_speed * 0.01 * dt);
                s.set_scalef(scale, scale, scale);
                s.mesh.set_vertex_alpha(alpha + 0.3);
            }

            smoke_alpha[i] = alpha;
        }

        hit_timer += dt;
        if(hit_timer > 3)
        {
            hit_timer = 0;
            game_state = 2;
            smoke_root.set_active(false);
        }
    }
    else if(game_state == 2) // recover
    {
        hit_timer += dt;
        if(hit_timer > 1)
        {
            game_over();
        }
    }


    // WEATHER ZONES

    zone_blend += dt * 0.5;
    if(zone_blend > 1) zone_blend = 1;
    if(zone_blend < 1)
    {

        if(zone == 0)
        {
            scene_mat.set_color('weather_blend', Color.tmpA.set(zone_blend,0,0,1.0 - zone_blend));
            scene_mat.set_vec3('light_dir', Vec3.tmpA.set(0.01,0.707,0.707));
            scene_mat.set_float('fog_end', 100.0);
            scene_mat.set_float('light_str', 0.2);
            var from = Color.tmpA.set(0.12,0.16,0.18,1);
            var to = Color.tmpB.set(0.43,0.76,0.93,1);
            var result = Color.tmpC;
            Color.lerp(result, from, to, zone_blend, Easing.lerp);
            bg_cam.color.copy(result);
            scene_mat.set_color('fog_color', result);
        }
        else if(zone == 1)
        {
            scene_mat.set_color('weather_blend', Color.tmpA.set(1.0 - zone_blend,zone_blend,0,0));
            refl_cam.overlay.material.set_float('alpha', Easing.lerp(0.2, 0.5, zone_blend));
            scene_mat.set_float('fog_end', Easing.lerp(100.0, 70.0, zone_blend));
            var from = Color.tmpA.set(0.43,0.76,0.93,1);
            var to = Color.tmpB.set(0.602,0.602,0.602,1);
            var result = Color.tmpC;
            Color.lerp(result, from, to, zone_blend, Easing.lerp);
            bg_cam.color.copy(result);
            scene_mat.set_color('fog_color', result);
        }
        else if(zone == 2)
        {
            scene_mat.set_color('weather_blend', Color.tmpA.set(0,1.0 - zone_blend,zone_blend,0));
            refl_cam.overlay.material.set_float('alpha', Easing.lerp(0.5, 0.65, zone_blend));
            var from = Color.tmpA.set(0.602,0.602,0.602,1);
            var to = Color.tmpB.set(0.43,0.76,0.93,1);
            var result = Color.tmpC;
            Color.lerp(result, from, to, zone_blend, Easing.lerp);
            bg_cam.color.copy(result);
            scene_mat.set_color('fog_color', result);
                        
            var scale = 1.0;
            var scale_blend = Easing.lerp(0,1,zone_blend * 2);

            if(scale_blend > 0.5 && tree_switch == true)
            {
                var tree_winter = Mesh.find('tree-winter');
                for(var i = 0; i < num_trees; ++i)
                {
                    trees_left[i].mesh = tree_winter;
                    trees_right[i].mesh = tree_winter;
                }
                tree_switch = false;
            }

            if(scale_blend < 0.5)
            {
                scale = Easing.lerp(1.0, 0.0, scale_blend * 2.0);
            }
            else if(scale_blend < 1.0)
            {
                scale = Easing.lerp(0.0, 1.0, (scale_blend-0.5) * 2.0);
            }
            
            for(var i = 0; i < num_trees; ++i)
            {
                trees_left[i].set_scalef(scale, scale, scale);
                trees_right[i].set_scalef(scale, scale, scale);
            }
        }
        else if(zone == 3)
        {
            scene_mat.set_color('weather_blend', Color.tmpA.set(0,0,1.0 - zone_blend,zone_blend));
            refl_cam.overlay.material.set_float('alpha', Easing.lerp(0.65, 0.01, zone_blend));
            scene_mat.set_float('fog_end', Easing.lerp(70.0, 100.0, zone_blend));
            scene_mat.set_float('light_str', Easing.lerp(0.2, 0.6, zone_blend));
            var from = Color.tmpA.set(0.43,0.76,0.93,1);
            var to = Color.tmpB.set(0.12,0.16,0.18,1);
            var result = Color.tmpC;
            Color.lerp(result, from, to, zone_blend, Easing.lerp);
            bg_cam.color.copy(result);
            scene_mat.set_color('fog_color', result);

            var scale = 1.0;
            var scale_blend = Easing.lerp(0,1,zone_blend * 2);

            if(scale_blend > 0.5 && tree_switch == true)
            {
                var tree = Mesh.find('tree');
                for(var i = 0; i < num_trees; ++i)
                {
                    trees_left[i].mesh = tree;
                    trees_right[i].mesh = tree;
                }
                tree_switch = false;
            }

            if(scale_blend < 0.5)
            {
                scale = Easing.lerp(1.0, 0.0, scale_blend * 2.0);

            }
            else if(scale_blend < 1.0)
            {
                scale = Easing.lerp(0.0, 1.0, (scale_blend-0.5) * 2.0);
            }
            
            for(var i = 0; i < num_trees; ++i)
            {
                trees_left[i].set_scalef(scale, scale, scale);
                trees_right[i].set_scalef(scale, scale, scale);
            }
        }
    }

    if(game_state != 3)
    {
        progress += car_speed * dt;
        if(progress > max_progress)
        {

            progress = 0;
            //game_state = 3;
            zone = 0;
            zone_blend = 0;
            headlights.set_active(false);
        }
        else if(progress > max_progress * 0.75)
        {
            set_weather(3);
        }
        else if(progress > max_progress * 0.5)
        {
            set_weather(2);
        }
        else if(progress > max_progress * 0.25)
        {
            set_weather(1); 
        }
    }
    

    if(zone === 3)
    {
        var dir = Vec3.tmpC;
        dir.set(-x_velocity, -0.3, 1);
        scene_mat.set_vec3('light_dir', dir);   
    }
    else
    {
    	var dir = Vec3.tmpC;
        dir.set(0.01,0.707,0.707);
        scene_mat.set_vec3('light_dir', dir);   
    }

    var inv_progress = progress / max_progress;

    x_velocity += x_accel;
    if(x_velocity > 6) x_velocity = 6;
    else if(x_velocity < -6) x_velocity = -6;


    //bg_cam.entity.set_rotf(0, 0, car_tilt * 0.2);
    car.set_rotf(0, (-car_tilt * 2) + car_spin, 0);
    car_body.set_rotf(car_lurch * inv_speed,0,car_tilt);


    var limit = 3;
    if(p.x > limit)
    {
        car_speed *= 0.9;
        if(x_velocity > 0) 
        {
            mod_score(-10);
            x_velocity = -x_velocity * 0.8;
        }
        car_tilt = 0;
    }
    else if(p.x < -limit)
    {
        car_speed *= 0.9;
        if(x_velocity < 0) 
        {
            mod_score(-10);
            x_velocity = -x_velocity * 0.8;
        }
        car_tilt = 0; 
    }

    p.x += x_velocity * dt;
    car.set_dirty();

    // CAR BOB
    
    car_bob += car_bob_dir * car_bob_speed * inv_speed * dt;
    if(car_bob > 0.01) 
    {
        car_bob_dir = -1.0;
        car_bob = 0.01;
    }
    else if(car_bob < -0.01)
    {
        car_bob_dir = 1.0;
        car_bob = -0.01;
    }
    car_body.pos.y = car_bob;

    // WHEELS

    for(var i = 0; i < 4; ++i)
    {
        wheels[i].rotatef(-car_speed * 3,0,0);
    }

    var clip = 8;

    for(var i = 0; i < num_trees; ++i)
    {
        var tree = trees_left[i];
        p = tree.pos;
        p.z += car_speed * dt;
        if(p.z > clip)
        {
            p.z = -120;
        }
        tree.set_dirty();

        tree = trees_right[i];
        p = tree.pos;
        p.z += car_speed * dt;
        if(p.z > clip)
        {
            p.z = -120;
        }
        tree.set_dirty();
    }
    
    // GROUND
    var least_z = 0;
    for(var i = 0; i < num_ground; ++i)
    {
        var g = ground[i];
        p = g.pos;
        p.z += car_speed * dt;
        if(p.z < least_z) least_z = p.z;
    }
    for(var i = 0; i < num_ground; ++i)
    {
        var g = ground[i];
        p = g.pos;
        if(p.z > 76)
        {
            p.z = least_z - 76;
        }
        g.set_dirty();
    }

    // RAIN / SNOW
    if(particle_root.active)
    {
        var rot = Easing.lerp(0,20, inv_speed);
        particle_root.set_rotf(-rot, 0, 10 * (1-inv_speed));
        var fall_speed = Easing.lerp(10,20,inv_speed);
        for(var i = 0; i < num_particles; ++i)
        {
            var ptcl = particles[i];
            p = ptcl.pos;
            p.y -= (fall_speed + (i+1)) * dt;
            if(p.y < -4) 
            {
                p.y = 4.2 * (i+1);
            }
            ptcl.set_dirty(); 
        }
    }
    // OBSTACLES

    if(game_state == 0)
    {
        obstacle_timer -= dt * inv_speed * 2;
        if(obstacle_timer < 0)
        {
            obstacle_timer = randf(2.0, 6.0);
            var index = rand_int(0, (num_obstacles-1)*2);
            if(index > num_obstacles - 1) index = 6;
            var new_obstacle = obstacles[index];
        
            if(new_obstacle.active == true)
            {
                for(var i = 0; i < num_obstacles; ++i)
                {
                    if(obstacles[i].active == false)
                        new_obstacle = obstacles[i];
                }
            }
            
            var rx = randf(new_obstacle.data.minx, new_obstacle.data.maxx);
            new_obstacle.set_posf(rx,0,-80);
            new_obstacle.set_active(true);
        }
    }
    
    for(var i = 0; i < num_obstacles; ++i)
    {
        var obstacle = obstacles[i];
        
        if(obstacle.active == true)
        {
            p = obstacle.pos;
            p.z += (car_speed + obstacle.data.speed) * dt;

            if(p.z > clip)
            {
                p.z = -80;
                obstacle.set_active(false);
                mod_score(100);
            }
            obstacle.set_dirty();
        }
    }
    

    // CLOUDS

    for(var i = 0; i < num_clouds; ++i)
    {
        var c = clouds[i];
        c.pos.x -= 0.1 * dt;
        if(c.pos.x < -80) c.pos.x = 80;
        c.set_dirty();
    }


    // SCORE

    var screen_pos = Vec3.tmpC;
    var world_pos = Vec3.tmpB.copy(car.pos);
    world_pos.x -= 0.2;
    world_pos.y += (0.8 + (1-(score_tween * 0.5)));
    bg_cam.world_to_screen(world_pos, screen_pos);

    score_display.style.left = screen_pos.x + 'px';
    score_display.style.top = screen_pos.y + 'px';

    if(score_tween > 0)
    {
        score_tween -= 2.0 * dt;
        if(score_tween < 0) score_tween = 0;
        score_display.style.opacity = score_tween;
    }

    onyx.scene.update(dt);
    onyx.input.update();

    gl.frontFace(gl.CCW);
    scene_mat.shader = vertex_shader;
    onyx.scene.render_camera(onyx.renderer, bg_cam);

    var rt = refl_cam.render_targets[0];
    rt.bind();
    scene_mat.shader = refl_shader;
    gl.frontFace(gl.CW);
    onyx.scene.render_camera(onyx.renderer, refl_cam);
    rt.unbind();
    gl.frontFace(gl.CCW);
    refl_cam.render(onyx.renderer);
    
    scene_mat.shader = vertex_shader;
    onyx.scene.render_camera(onyx.renderer, fg_cam);

    onyx.scene.render_camera(onyx.renderer, gui_cam);
    onyx.scene.render(onyx.renderer);
}

function mod_score(val)
{
    score_tween = 1.0;
    score += val;
    if(score < 0) score = 0;
    
    if(val > 0)
    {
        score_display.innerText = "+" + val;
        score_display.classList.add('game-score-positive');
    }
    else
    {
        score_display.innerText = "-" + (-val);
        score_display.classList.remove('game-score-positive');
    }

    hud_score.innerText = "SCORE:" + score;

    request_rank(score);
}

function randf(min, max) 
{
    return Math.random() * (max - min) + min;
}
function rand_int(min, max) 
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function game_reset()
{
    reset_car();

    progress = 0;
    score = 0;
    rank = 0;
    car_max_speed = 100;
    car_turn_speed = 10;
    car_bob_speed = 0.1;

    for(var i = 0; i < num_obstacles; ++i)
    {
        obstacles[i].set_posf(50,0,50);
        obstacles[i].set_active(false);
    }

    //set trees
    var tree = Mesh.find('tree');
	for(var i = 0; i < num_trees; ++i)
	{
	    trees_left[i].mesh = tree;
	    trees_right[i].mesh = tree;
	}
	
    car_brake_strength = 0.98;

    steering_response = 0.9;
    paused = false;

    set_weather(0);

    hud_rank.innerText = "RANKING:LAST";
    hud_score.innerText = "SCORE:0";

    game_state = 0;
}

function reset_car()
{
    car_speed = 0;
    car_accel = 15.0;
    car.pos.set(0,0,0);
    last_pos.set(0,0,0);
    x_velocity = 0;
    obstacle_timer = 4.0;
    car_tilt = 0;
    car_drift = 0;
    car_lurch = 0;
    car_spin = 0;
    car_spin_rate = 0;
    car_h = 0;
    car_bob = 0;
    car_bob_dir = 1;
    smoke_root.set_active(false);
}

function set_weather(w)
{
    if(w == zone) return;
    zone = w;
    zone_blend = 0;
    tree_switch =  true;

    if(w === 0) //sunny
    {
        bg_cam.color.set(0.43,0.76,0.93,1);
        refl_cam.overlay.material.set_float('alpha', 0.01);
        scene_mat.set_color('weather_blend', Color.tmpA.set(1,0,0,0));
        scene_mat.set_vec3('light_dir', Vec3.tmpA.set(0.01,0.707,0.707));
        scene_mat.set_float('fog_end', 100.0);
        scene_mat.set_float('light_str', 0.2);
        scene_mat.set_color('fog_color', Color.tmpA.set(0.43,0.76,0.93,1));
        car_brake_strength = 0.98;
        particle_root.set_active(false);

        steering_response = 0.91;
    }
    else if(w === 1) //rainy
    {
        car_brake_strength = 0.975;
        particle_root.set_active(true);
        steering_response = 0.93;
    }
    else if(w === 2) //snowy
    {
        car_brake_strength = 0.97;
        particle_root.set_active(true);
        steering_response = 0.99;
    }
    else if(w === 3) //tired
    {
        car_brake_strength = 0.96;
        headlights.set_active(true);
        particle_root.set_active(false);
        steering_response = 0.96;
    }
}

function game_over()
{
    hit_timer = 0;
    post_score(player_name, score);
   
    document.querySelector('.score-val').innerText = score;
    if(score === 0 || rank === score_list.length)
    {
        document.querySelector('.rank-val').innerText = "LAST";
    }
    else
    {
        document.querySelector('.rank-val').innerText = rank + "/" + score_list.length;
    }

    var score_rating = "Looks like you’re a bit rusty! Stay safe by following these tips when driving.";
    if(score >= 4000)
    {
        score_rating = "What a pro! You're among the safest drivers on the road - read through our tips to keep your driving skills on point.";
    }
    else if(score >= 2000)
    {
        score_rating = "Finally some experience -well done on being one of the safer drivers out there! You can never be too safe so make sure to check out our top tip below.";
    }
    else if(score >= 300)
    {
        score_rating = "Not bad! Hope you’re a bit more cautious out in the real world. Take our tip with you next time you hit the road.";
    }

    document.querySelector('.score-table').innerText = score_rating;


    var tips;
    if(zone === 0)
    {
        tips = "<p>Blue skies and sunshine are the perfect conditions for a relaxing drive, but don’t forget your polarised sunglasses next time you’re taking the car out for a spin in the sun.</p><p>The sun is likely to cause you the most trouble just before sunset and just after sunrise, so be particularly alert when you’re behind the wheel at these times.</p><p>Clean your windscreen before setting off so you are not blinded by the reflection on drops of windscreen washer fluid. Dirt or grime on the outside or inside of the windscreen causes the light to scatter, increasing the glare.</p>";
    }
    else if(zone === 1)
    {
        tips = "<p>Heavy rain is one of the toughest weather conditions to drive in. Rain not only reduces visibility, but also reduces the amount of grip your car has, increasing stopping distances.</p><p>Plan your journey in advance and avoid any areas that are prone to flooding when it’s pouring down.</p><p>Remember the two-second rule and make sure you have enough space both in front and behind your car at all times.</p>";
    }
    else if(zone === 2)
    {
        tips = "<p>Snow and ice are particularly challenging conditions for driving. They greatly reduce visibility and make controlling your car a lot harder.</p><p>Drive your car smoothly, slowly and keep much larger gaps between you and neighbouring vehicle</p><p>If you end up skidding, relax the clutch and turn carefully into the direction of the skid. Wait for the car to straighten but do not brake, as this can make the skid even worse.</p>";
    }
    else if(zone === 3)
    {
        tips = "<p>Driving at night when you’re tired can be just as dangerous as drink driving. Your depth perception, ability to distinguish colour, and peripheral vision are all worse in low-light conditions. Driver fatigue and tiredness remains a large cause of fatalities on the night time roads.</p><p>Take rest breaks at service stations at least every two hours to prevent drowsiness.</p><p>Drive at a speed that allows you to spot hazards and react accordingly.</p><p>Lower the lighting inside of your car and on your dash to prevent unnecessary glares and compromise your forward vision.</p>";
    }

    document.querySelector('.driving-tips').innerHTML = tips;

    game_state = 3;
    gl_canvas.classList.remove('active');
    onyx_bg.classList.remove('active');
    game_entry.classList.remove('playing');
    hud.classList.remove('visible');
    blue_road.classList.add('visible');
    game_over_screen.classList.add('visible');
    sharing.classList.add('visible');
}

function post_score(name, score)
{
    if(name === null || name === undefined || name === "") return;

    var url = "https://citipark.co.uk/scores/submit";
    var params = "name="+name+"&score="+score;
    var request = new XMLHttpRequest();

    request.open("POST", url, true);
    request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    request.send(params);
}


function get_score_list()
{
    var url = "https://citipark.co.uk/scores/score";
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = on_score_list_received;
    request.send();
}
function on_score_list_received(e)
{
    score_list = [];
    if(e.target.status == 200)
    {
        var list = JSON.parse(e.target.response);
        for(var key in list)
        {
            var entry = list[key];
            score_list.push(entry.score);
        }
    }
}

function request_rank(score)
{
    if(score_list === null || score_list === undefined)
    {
        return;
    }

    var n = score_list.length
    rank = n;
    for(var i = 0; i < n; ++i)
    {
        if(score > score_list[i])
        {
            rank = i+1;
            break;
        }
    }

    hud_rank.innerText = "RANK: " + rank + "/" + n;
}
function on_rank_received(e)
{
    if(e.target.status == 200)
    {
        rank = e.target.response;
        if(rank === 100)
        {
            hud_rank.innerText = "LAST";
        }
        else
        {
            hud_rank.innerText = "RANK: " + rank + "/" + total_ranks;
        }
    }
}

function game_retry()
{
    game_state = 0;
    game_reset();
}