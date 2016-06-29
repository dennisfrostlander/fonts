import {applyDirectoryVisitor} from "./applyVisitor";

gulp.task('metadata-create', function(cb){
    var ProtoBuf = require("protobufjs");
    var builder = ProtoBuf.loadProtoFile(path.join(__dirname, "../tools/fonts_public.proto"));
    var Fonts = builder.build("google.fonts");
    var spawn = require('child_process').spawn;

    applyDirectoryVisitor(dir => {
        var pbFile = fs.readFileSync(path.join(dir, 'METADATA.pb'));
        var args = [
            "--encode=google.fonts.FamilyProto",
            "tools/fonts_public.proto"];
        var protoc = spawn(path.join(__dirname, '../tools/protoc.exe'), args, {cwd: path.join(__dirname, '..')});

        protoc.stdout.on('data', (data) => {
            var family = Fonts.FamilyProto.decode(data);
            var jsonFile = path.join(dir, "metadata.json");
            console.log("Writing ", jsonFile);
            fs.writeFileSync(jsonFile, JSON.stringify(family, null, '\t'), 'utf-8');
        });

        protoc.stderr.on('data', (data) => {
            cb(data);
        });

        protoc.on('exit', (code) => {
            if (code){
                console.log(`Child exited with code ${code}`);
            }
        });

        protoc.stdin.write(pbFile);
        protoc.stdin.end();
    }).then(() => cb());
});