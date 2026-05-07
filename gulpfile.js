#!/usr/bin/env node

'use strict';

var version = require('./lib/version.json');
var path = require('path');

var del = require('del');
var gulp = require('gulp');
var browserify = require('browserify');
var uglify = require('uglify-js');
var rename = require('gulp-rename');
var through = require('through2');
var exorcist = require('exorcist');
var Vinyl = require('vinyl');

function minify() {
  return through.obj(function (file, enc, cb) {
    if (file.isBuffer()) {
      var result = uglify.minify(file.contents.toString());
      if (result.error) return cb(result.error);
      file.contents = Buffer.from(result.code);
    }
    cb(null, file);
  });
}

// Replacement for vinyl-source-stream that produces gulp 5-compatible Vinyl objects
function toVinyl(filename) {
  return through.obj(function (chunk, enc, cb) {
    cb(null, new Vinyl({
      path: filename,
      contents: typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    }));
  });
}
var bower = require('bower');
var replace = require('gulp-replace');

var DEST = path.join(__dirname, 'dist/');
var src = 'index';
var dst = 'chain3';
var lightDst = 'chain3-light';

var browserifyOptions = {
    debug: true,
    insert_global_vars: false, // jshint ignore:line
    detectGlobals: true,
    bundleExternal: true
};

gulp.task('version', function(done){
  var streams = [
    gulp.src(['./package.json'])
      .pipe(replace(/\"version\"\: \"([\.0-9]*)\"/, '"version": "'+ version.version + '"'))
      .pipe(gulp.dest('./')),
    gulp.src(['./bower.json'])
      .pipe(replace(/\"version\"\: \"([\.0-9]*)\"/, '"version": "'+ version.version + '"'))
      .pipe(gulp.dest('./')),
    gulp.src(['./package.js'])
      .pipe(replace(/version\: \'([\.0-9]*)\'/, "version: '"+ version.version + "'"))
      .pipe(gulp.dest('./'))
  ];
  var count = streams.length;
  streams.forEach(function(s) {
    s.on('end', function() {
      if (--count === 0) done();
    });
    s.on('error', done);
  });
});

gulp.task('bower', gulp.series(['version'], function(cb, done){
    bower.commands.install().on('end', function (installed){
        console.log(installed);
        cb();
        done();
    });
}));

gulp.task('lint', function(done){
    done();
});

gulp.task('clean', gulp.series(['lint'], function(cb) {
    del([ DEST ]).then(cb.bind(null, null));
}));

gulp.task('light', function () {
    return browserify(browserifyOptions)
        .require('./' + src + '.js', {expose: 'chain3'})
        .ignore('bignumber.js')
        .require('./lib/utils/browser-bn.js', {expose: 'bignumber.js'}) // fake bignumber.js
        .add('./' + src + '.js')
        .bundle()
        .pipe(exorcist(path.join( DEST, lightDst + '.js.map')))
        .pipe(toVinyl(lightDst + '.js'))
        .pipe(gulp.dest( DEST ))
        .pipe(minify())
        .pipe(rename(lightDst + '.min.js'))
        .pipe(gulp.dest( DEST ));
});

gulp.task('standalone', function () {
    return browserify(browserifyOptions)
        .require('./' + src + '.js', {expose: 'chain3'})
        .require('bignumber.js') // expose it to dapp users
        .add('./' + src + '.js')
        .ignore('crypto')
        .bundle()
        .pipe(exorcist(path.join( DEST, dst + '.js.map')))
        .pipe(toVinyl(dst + '.js'))
        .pipe(gulp.dest( DEST ))
        .pipe(minify())
        .pipe(rename(dst + '.min.js'))
        .pipe(gulp.dest( DEST ));
});

gulp.task('watch', function(done) {
    gulp.watch(['./lib/*.js'], ['lint', 'build']);
    done();
});

gulp.task('default', gulp.series('version', 'lint', 'clean', 'light', 'standalone'));