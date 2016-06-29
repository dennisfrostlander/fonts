import {applyDirectoryVisitor} from "./applyVisitor";

gulp.task("samples-generate", function(cb){
    var express = require('express');
    var app = express();
    var staticDirs = ["apache", "ofl", "ufl", "samples", "node_modules"];

    for (var i = 0; i < staticDirs.length; i++){
        var dir = staticDirs[i];
        app.use('/' + dir, express.static(dir));
    }

    var port = 8090;
    app.listen(port, function(){
        console.log('Listening...');
        makeSamples(port, cb);
    });
});

function makeSamples(port, cb){
    var workerFarm = require('worker-farm');
    var workers = workerFarm({
            maxConcurrentWorkers: 3,
            maxConcurrentCallsPerWorker: 1
        },
        require.resolve('../samples/sampleWorker'));

    applyDirectoryVisitor(dir =>{
        var pngPath = path.join(dir, "sample.png");
        var errPath = path.join(dir, "err");
        var seen = fs.existsSync(pngPath) || fs.existsSync(errPath);
        if (options.force || !seen){
            workers(port, dir, options, function(err, outp){
                if (err){
                    console.error("Worker error in", dir);
                    fs.writeFileSync(errPath, JSON.stringify(err), 'utf-8');
                }
            })
        }
    }).then(() =>{
        workerFarm.end(workers);
        cb();
    });
}

gulp.task('samples-upload', function(cb){
    var workerFarm = require('worker-farm');
    cdnUpload(workerFarm)
        .then(() => combineMetadata(workerFarm))
        .then(() => cb());
});

function combineMetadata(workerFarm){
    var workers = workerFarm({
            maxConcurrentWorkers: 1,
            maxConcurrentCallsPerWorker: 1
        },
        require.resolve('../samples/combineWorker'));

    return applyDirectoryVisitor(dir =>{
        var pngPath = path.join(dir, "sample.png");
        var errPath = path.join(dir, "err");
        var processed = fs.existsSync(pngPath) || fs.existsSync(errPath);
        if (processed){
            workers(dir, options, function(err, outp){
                if (err){
                    console.error("Worker error in", dir);
                }
                else{
                    console.log(outp);
                }
            })
        }
    }).then(() =>{
        workerFarm.end(workers);
    });
}

function cdnUpload(workerFarm){
    var workers = workerFarm({
            maxConcurrentWorkers: 1,
            maxConcurrentCallsPerWorker: 1
        },
        require.resolve('../samples/uploadWorker'));

    return applyDirectoryVisitor(dir =>{
        var pngPath = path.join(dir, "sample.png");
        var errPath = path.join(dir, "err");
        var processed = fs.existsSync(pngPath) || fs.existsSync(errPath);
        if (processed){
            workers(dir, options, function(err, outp){
                if (err){
                    console.error("Worker error in", dir);
                }
                else{
                    console.log(outp);
                }
            })
        }
    }).then(() =>{
        workerFarm.end(workers);
    });
}