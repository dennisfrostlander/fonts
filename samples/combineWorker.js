var path = require("path");
var fs = require("fs");
//var request = require("request");

var initialized = false;
function init(options){
    var targetPath = path.join(__dirname, "../dist/systemFonts.json");

    if (!initialized){
        if (!fs.existsSync(targetPath) || options.force){
            fs.writeFileSync(targetPath, '{"collection":[]}', 'utf-8');
        }
        initialized = true;
    }

    return targetPath;
}

function strip(obj, except){
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++){
        var key = keys[i];
        if (except.indexOf(key) === -1){
            delete obj[key];
        }
    }
}

module.exports = function(dir, options, callback){
    var metadataString = fs.readFileSync(path.join(dir, 'metadata.json'), 'utf-8');
    var metadata = JSON.parse(metadataString);

    strip(metadata, ["name", "fonts", "subsets"]);
    for (var j = 0; j < metadata.fonts.length; j++){
        var font = metadata.fonts[j];
        strip(font, ["filename", "style", "weight"]);
    }

    metadata.path = path.relative(".", dir).replace("\\", "/");

    var targetPath = init(options);
    var systemFonts = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
    systemFonts.collection.push(metadata);
    fs.writeFileSync(targetPath, JSON.stringify(systemFonts), 'utf-8');
    callback(null, dir);

    // var formData = {
    //     metadata: metadataString,
    //     //my_file: fs.createReadStream(__dirname + '/unicycle.jpg'),
    //     attachments: []
    // };
    //
    // for (var i = 0; i < metadata.fonts.length; i++){
    //     var font = metadata.fonts[i];
    //     formData.attachments.push(fs.createReadStream(path.join(dir, font.filename)));
    // }
    //
    // request.post({url:'http://localhost:50150/api/fonts/uploadSystemFont', formData: formData}, function optionalCallback(err, httpResponse, body) {
    //     callback(err, metadata.name);
    // });
};
