var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('gulp-browserify');
var less = require('gulp-less');
var path = require('path');
var newer = require('gulp-newer');
var imagemin = require('gulp-imagemin');
var fs = require('fs');
var awspublish = require('gulp-awspublish');
var notify = require("gulp-notify");
var jade = require('gulp-jade');
var async = require('async');
var rename = require("gulp-rename");

// browserify js and template files
// only need index file
// requires get pulled in automatically
gulp.task('browserify', function(){
    gulp.src('./src/js/index.js')
        .pipe(browserify(
            {
                'insertGlobals': true,
                'debug': gutil.env.production,
                'transform': ['hbsfy']
            }
        )
        .on('error', notify.onError(
            function (error) {
                return error.message;
            }
        )))
        .pipe(gulp.dest('./build/js'))
});

// convert less files to css
// only need index file
// imports get pulled in automatically
gulp.task('less', function(){
    var l = less(
        {
            'paths': ['src/less']
        }
    );
    l.on(
        'error',
        function(e){
            gutil.log(e);
            l.end();
        }
    );
    .src('./src/less/index.less')
        .pipe(l)
        .pipe(gulp.dest('./build/css'));
    }    
);

// minify images
// put them in build folder
gulp.task('imagemin', function(){
    gulp.src('src/images/**')
        .pipe(newer('./build/images'))
        .pipe(imagemin())
        .pipe(gulp.dest('./build/images'));
    }
);

// build regular html
// put in build folder
gulp.task('html', function() {
    if(gutil.env.project){
        gulp.src('src/' + gutil.env.project + '/html/**')
            .pipe(gulp.dest('./build/' + gutil.env.project));
    }
    else{
        gulp.src("")
            .pipe(notify({
                message: "Please provide a project!"
        }));
    }
});

// minify html
// put it in build folder
gulp.task('htmlmin', function(){
    gulp.src('./src/html/**')
    .pipe(htmlmin(
        {
            'collapseWhitespace': true
        }
    ))
    .pipe(gulp.dest('./build'))
});

// build jade into html
// put in build folder
gulp.task('jade', function(){
    gulp.src('./src/jade/*.jade')
        .pipe(jade({
            'locals': 
                {
                    'project': gutil.env.project
                }
        }))
        .pipe(gulp.dest('./build/'))
    }
);

// copy fonts to build dir
gulp.task('fontcopy', function(){
    gulp.src('./src/fonts/**/', 
        {
            'base': './src/fonts'
        }
    )
    .pipe(gulp.dest('./build/fonts/')); 
});


// copy flash to build dir
gulp.task('flashcopy', function(){
    gulp.src('./src/flash/**/')
        .pipe(gulp.dest('./build/flash'));
});

// copy data to build dir
gulp.task('datacopy', function(){
    gulp.src('./src/data/**/')
        .pipe(gulp.dest('./build/data'));
});


// deploy to S3 bucket
gulp.task('deploy', function () {
    runSynchronized(['build', 'publish']);
});


gulp.task('publish', function(){
    var src = './build/' + gutil.env.project + '/**';
    var aws = JSON.parse(fs.readFileSync('./aws.json'));
    var publisher = awspublish.create(aws);
    var headers = { 'Cache-Control': 'max-age=315360000, no-transform, public' };
    //var options = {'simulate': true};
    var js = gulp.src('./build/**')
        .pipe(publisher.publish(headers))
        .pipe(publisher.cache())
        .pipe(awspublish.reporter());
});


// build all one time
gulp.task('build',
    [
        'browserify',
        'less',
        'imagemin',
        'jade',
        'html',
        'fontcopy',
        'flashcopy',
        'datacopy'
    ]
);

gulp.task('watch', function () {
    runSynchronized(['build', 'watchFiles']);
});

// watch files for changes
// js & templates -> browserify
// less -> less
gulp.task('watchFiles', function(){
    gulp.watch('src/js/**', ['browserify']);
    gulp.watch('src/templates/**', ['browserify']);
    gulp.watch('src/less/**', ['less']);
    gulp.watch('src/images/**', ['imagemin']);
    gulp.watch('src/jade/*.jade', ['jade']);
    gulp.watch('src/html/*.html', ['html']);
    gulp.watch('src/fonts/**', ['fontcopy']);
    gulp.watch('src/flash/**', ['flashcopy']);
    gulp.watch('src/data/**', ['datacopy']);
});

function runSynchronized(tasks, callback){
    var sync = tasks.map(function(task){
        return function(callback){
            gulp.run(task, function(err){
                callback(err);
            });
        };
    });
    async.series(sync, callback);
}


// gulp watch (watches for changes and builds)
// gulp build (one time build)
// gulp deploy (build once then deploy to S3)