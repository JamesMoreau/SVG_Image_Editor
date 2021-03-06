'use strict'

// C library API
const ffi = require('ffi-napi');

var cLib = ffi.Library('./libsvgparse.so', {
  //"functionName": ["returnType", ["param1", "param2"]],
  "SVGtoJSON_Wrapper": ["string", ["string", "string"]],
  "SVG_get_title_Wrapper": ["string", ["string", "string"]],
  "SVG_get_title_Wrapper": ["string", ["string", "string"]],
  "SVG_get_description_Wrapper": ["string", ["string", "string"]],
  "rectListToJSON_Wrapper": ["string", ["string", "string"]],
  "circListToJSON_Wrapper": ["string", ["string", "string"]],
  "pathListToJSON_Wrapper": ["string", ["string", "string"]],
  "groupListToJSON_Wrapper": ["string", ["string", "string"]],
  "attrListToJSON_Wrapper": ["string", ["string", "string", "int", "int"]],
  "validateSVGimage_Wrapper": ["bool", ["string", "string"]],
  "setAttribute_Wrapper": ["void", ["string", "string", "int", "int", "string", "string"]],
  "setTitle_Wrapper": ["void", ["string", "string", "string"]],
  "setDescription_Wrapper": ["void", ["string", "string", "string"]],
  "create_empty_svg_image_wrapper": ["void", ["string"]],
  "add_component_Wrapper": ["void", ["string", "string", "int", "string", "string"]],
  "scale_components_Wrapper": ["void", ["string", "string", "int", "double"]],
});

// Express App (Routes)
const express = require("express");
const app = express();
const path = require("path");
const fileUpload = require('express-fileupload');

app.use(fileUpload());
app.use(express.static(path.join(__dirname + '/uploads')));

// Minimization
const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');

// Important, pass in port as in `npm run dev 1234`, do not change
const portNum = process.argv[2];

// Send HTML at root, do not change
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/public/index.html'));
});

// Send Style, do not change
app.get('/style.css', function (req, res) {
  //Feel free to change the contents of style.css to prettify your Web app
  res.sendFile(path.join(__dirname + '/public/style.css'));
});

// Send obfuscated JS, do not change
app.get('/index.js', function (req, res) {
  fs.readFile(path.join(__dirname + '/public/index.js'), 'utf8', function (err, contents) {
    const minimizedContents = JavaScriptObfuscator.obfuscate(contents, { compact: true, controlFlowFlattening: true });
    res.contentType('application/javascript');
    res.send(minimizedContents._obfuscatedCode);
  });
});

//Respond to POST requests that upload files to uploads/ directory
app.post('/upload', function (req, res) {
  if (!req.files) {
    return res.status(400).send('No files were uploaded.');
  }

  let uploadFile = req.files.uploadFile;
  console.log("Files: " + req.files);

  if (uploadFile == undefined) {
    console.log("upload file is undefined!");
    return res.status(400).send('upload file is undefined!');
  }

  let files = fs.readdirSync('./uploads/');
  for (let x in files) {
    if (uploadFile.name.localeCompare(files[x]) == 0) {
      console.log('upload file: ' + uploadFile.name + ' files[x]' + files[x]);
      console.log('svg was already on the server!');
      return res.status(400).send('file already uploaded!');
    }
  }

  // Use the mv() to place the file somewhere on your server
  uploadFile.mv(__dirname + '/uploads/' + uploadFile.name, function (err) {
    if (err) {
      return res.status(500).send(err);
    }
    console.log("moved file to " + __dirname + '/uploads/' + uploadFile.name);

    let val = cLib.validateSVGimage_Wrapper(__dirname + '/uploads/' + uploadFile.name, './parser/test/schemaFiles/svg.xsd');
    console.log(val);
    if (val == false) {
      console.log('file was not valid');

      try {
        fs.unlinkSync(__dirname + '/uploads/' + uploadFile.name)
      } catch {
        console.log("unable to delete file from server. :( ");
      }
      return res.status(400).send('file was not valid.');
    }

    res.redirect('/');
  });
});

//Respond to GET requests for files in the uploads/ directory
app.get('/uploads/:name', function (req, res) {
  fs.stat('uploads/' + req.params.name, function (err, stat) {
    if (err == null) {
      res.sendFile(path.join(__dirname + '/uploads/' + req.params.name));
    } else {
      console.log('Error in file downloading route: ' + err);
      res.send('');
    }
  });
});

//******************** Your code goes here ******************** 
app.get('/getFiles', function (req, res) {
  let files = fs.readdirSync('./uploads/');
  console.log('Sending the files...');
  console.log(files);
  let listOfFiles = [];
  for (let x in files) {
    let fileStats = fs.statSync(__dirname + '/uploads/' + files[x]);

    let string = cLib.SVGtoJSON_Wrapper(__dirname + '/uploads/' + files[x], './parser/test/schemaFiles/svg.xsd');
    if (string.localeCompare("{}") == 0) {
      console.log('failed to validate svg image ' + files[x]);
      continue;
    }

    listOfFiles.push({
      fileName: files[x],
      size: Math.round(fileStats.size / 1000),
      SVGdata: JSON.parse(string),
    });
  }
  console.log(listOfFiles)
  res.send(listOfFiles);
});

app.get('/getFileData', function (req, res) {
  let fileName = req.query.fileName;
  console.log(fileName)

  let title_string = cLib.SVG_get_title_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd');
  if (title_string.localeCompare("") == 0) {
    console.log('No title for file.');
  } else {
    console.log(title_string);
  }

  let desc_string = cLib.SVG_get_description_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd');
  if (desc_string.localeCompare("") == 0) {
    console.log("No description for file.");
  } else {
    console.log(desc_string);
  }

  let rect_list_string = cLib.rectListToJSON_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd');
  if (rect_list_string.localeCompare("[]") == 0) {
    console.log("SVG has no rectangles.");
  } else {
    console.log(rect_list_string);
  }

  let circ_list_string = cLib.circListToJSON_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd');
  if (circ_list_string.localeCompare("[]") == 0) {
    console.log("SVG has no circles.");
  } else {
    console.log(circ_list_string);
  }

  let path_list_string = cLib.pathListToJSON_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd');
  if (path_list_string.localeCompare("[]") == 0) {
    console.log("SVG has no paths.");
  } else {
    console.log(path_list_string);
  }

  let attr_list_string = cLib.attrListToJSON_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 0, 0);
  if (attr_list_string.localeCompare("[]") == 0) {
    console.log("SVG has no attribute.");
  } else {
    console.log(attr_list_string);
  }

  let group_list_string = cLib.groupListToJSON_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd');
  if (group_list_string.localeCompare("[]") == 0) {
    console.log("SVG has no attribute.");
  } else {
    console.log(group_list_string);
  }

  let file_data = {
    fileName: fileName,
    title: title_string,
    description: desc_string,
    rectList: JSON.parse(rect_list_string),
    circList: JSON.parse(circ_list_string),
    pathList: JSON.parse(path_list_string),
    groupList: JSON.parse(group_list_string),
    attrList: JSON.parse(attr_list_string),
  };

  console.log('sending file data');
  console.log(file_data);
  res.send(file_data);
});

//Sample endpoint
app.get('/someendpoint', function (req, res) {
  let retStr = req.query.name1 + " " + req.query.name2;
  res.send({
    foo: retStr
  });
});

app.get('/send_edit', function (req, res) {
  console.log("edit data: " + JSON.stringify(req.query));
  let edit_data = req.query;

  if (edit_data.editValue.localeCompare("Title") == 0) {
    cLib.setTitle_Wrapper(__dirname + '/uploads/' + edit_data.fileName,
      './parser/test/schemaFiles/svg.xsd',
      edit_data.editText);
  } else if (edit_data.editValue.localeCompare("Description") == 0) {
    cLib.setDescription_Wrapper(__dirname + '/uploads/' + edit_data.fileName,
      './parser/test/schemaFiles/svg.xsd',
      edit_data.editText);
  } else {
    //set and attribute w/e it is
  }

  res.send({
    status: true,
  });
});

app.get('/create_image', function (req, res) {
  console.log("request for making new image received.");

  let fileName = req.query.fileName + '.svg';

  cLib.create_empty_svg_image_wrapper(fileName);
  console.log("created file: " + fileName);

  fs.renameSync(fileName, "./uploads/" + fileName, function (err) {
    console.log("moved file to correct dir");
  });

  res.send({
    status: true,
  });
});

app.get('/add_shape', function (req, res) {
  let data = req.query.data;
  let shape = req.query.shape;
  let fileName = req.query.fileName;
  let colour = req.query.colour;

  console.log("request for adding shape: " + shape + "received, with json data:" + data);

  console.log("adding shape to: " + fileName);

  if (shape.localeCompare("Rectangle") == 0) {
    cLib.add_component_Wrapper(__dirname + '/uploads/' + fileName,
      './parser/test/schemaFiles/svg.xsd',
      2,
      data,
      colour);

  } else if (shape.localeCompare("Circle") == 0) {
    cLib.add_component_Wrapper(__dirname + '/uploads/' + fileName,
      './parser/test/schemaFiles/svg.xsd',
      1,
      data,
      colour);
  } else {
    console.log("ERROR BAD SHAPE HOW");
  }

  console.log("added shape to image. ayyyy!");

  res.send({
    status: true,
  });
});

app.get('/get_component_data', function (req, res) {
  let fileName = req.query.fileName;
  let componentType = req.query.componentType;
  console.log(componentType);
  let index = parseInt(req.query.index) - 1;

  console.log("received request for attributes data")
  console.log(JSON.stringify(req.query));

  if (componentType.localeCompare("Rectangle") == 0) {
    console.log("rectangle string received: " + cLib.attrListToJSON_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 2, index))
    res.send({
      data: JSON.parse(cLib.attrListToJSON_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 2, index)),
    });

  } else if (componentType.localeCompare("Circle") == 0) {
    console.log("circle received: " + cLib.attrListToJSON_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 1, index));
    res.send({
      data: JSON.parse(cLib.attrListToJSON_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 1, index)),
    });

  } else if (componentType.localeCompare("Path") == 0) {
    console.log("Path received: " + cLib.attrListToJSON_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 3, index));
    res.send({
      data: JSON.parse(cLib.attrListToJSON_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 3, index)),
    });

  } else if (componentType.localeCompare("Group") == 0) {
    console.log("group received" + cLib.attrListToJSON_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 4, index));
    res.send({
      data: JSON.parse(cLib.attrListToJSON_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 4, index)),
    });

  } else {
    console.log("ERROR BAD COMPONENT HOW");
  }
});

app.get('/edit_attribute', function (req, res) {
  let fileName = req.query.fileName;
  let index = parseInt(req.query.index) - 1;
  let a_name = req.query.attributeName; 
  let a_value = req.query.attributeValue;
  let componentType = req.query.componentType;
  
  if (componentType.localeCompare("SVG") == 0) {
    cLib.setAttribute_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 0, index, a_name, a_value);

  } else if (componentType.localeCompare("Rectangle") == 0) {
    cLib.setAttribute_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 2, index, a_name, a_value);

  } else if (componentType.localeCompare("Circle") == 0) {
    cLib.setAttribute_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 1, index, a_name, a_value);
    
  } else if (componentType.localeCompare("Path") == 0) {
    cLib.setAttribute_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 3, index, a_name, a_value);
    
  } else if (componentType.localeCompare("Group") == 0) {
    cLib.setAttribute_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 4, index, a_name, a_value);

  } else {
    console.log("bad selection HOWW DID THIS HAPPEN X]");
  }

  console.log("edited/added image attribute!");
  res.send({
    status: true,
  });
});

app.get('/scale_components', function (req, res) {
  console.log('request for scaling shapes received');
  console.log(JSON.stringify(req.query));

  let fileName = req.query.fileName;
  let componentType = req.query.componentType;
  let factor = req.query.factor;
  
  if (componentType.localeCompare("Rectangle") == 0) {
    cLib.scale_components_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 2, factor);
    
  } else if (componentType.localeCompare("Circle") == 0) {
    cLib.scale_components_Wrapper(__dirname + '/uploads/' + fileName, './parser/test/schemaFiles/svg.xsd', 1, factor);
    
  } else {
    console.log("bad selection HOWW DID THIS HAPPEN XXXXX");
  }

  console.log("done scaled components!");
  res.send({
    status: true,
  });
});

app.listen(portNum);
console.log('Running app at localhost: ' + portNum);