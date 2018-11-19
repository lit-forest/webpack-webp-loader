var imagemin = require('imagemin');
var imageminWebp = require('imagemin-webp');
var loaderUtils = require('loader-utils');

module.exports = function (content) {
    this.cacheable && this.cacheable();
    if (!this.emitFile) throw new Error("emitFile is required from module system");
    var callback = this.async();
    var options = loaderUtils.getOptions(this);

    // 写入原文件
    var url = loaderUtils.interpolateName(this, options.name || "[hash].[ext]", {
        content: content,
        regExp: options.regExp
    });
    this.emitFile(url, content);

    // 如果源文件比较小，则没必要转换为webp格式的图片，直接使用callback传递给下一个loader处理
    var limit;
    if (options.limit) {
        limit = parseInt(options.limit, 10);
    }
    if (limit <= 0 || content.length < limit) {
        callback(null, { buffer: content, url })
        return;
    }

    // 根据options内容生成webpOptions
    var webpOptions = {
        preset: options.preset || 'default',
        quality: options.quality || 75,
        alphaQuality: options.alphaQuality || 100,
        method: options.method || 1,
        sns: options.sns || 80,
        autoFilter: options.autoFilter || false,
        sharpness: options.sharpness || 0,
        lossless: options.lossless || false,
    };
    if (options.size) {
        webpOptions.size = options.size;
    }
    if (options.filter) {
        webpOptions.filter = options.filter;
    }

    // 生成的webp图片的名称为原图片的名称后面追加.webp,
    // 例如：xxx.jpg.webp, 方便在css预处理器中的使用
    var webpUrl = url + '.webp';
    // 原图片异步转换为webp的图片
    imagemin.buffer(content, { plugins: [imageminWebp(webpOptions)] }).then(file => {
        // 写入webp图片并调用callback
        this.emitFile(webpUrl, file);
        // 传递给svg-placrholder-loader，继续处理成placeholder
        callback(null, { buffer: content, url, webpUrl });

        /* 如果要单独使用的话，可以使用该注释部分的代码
        const exportJson = 'module.exports = { ' +
            '"originSrc": __webpack_public_path__ + "' + url +
            '" , "webpSrc": __webpack_public_path__ + "' + webpUrl +
            '"' +
            ' };';
        callback(null, exportJson);   
        */
    }).catch(err => {
        callback(err);
    });

};

// 要求webpack传入原始的buffer，方便处理图片
module.exports.raw = true;