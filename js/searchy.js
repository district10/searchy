/**
 * Created by tzx on 2016/12/7.
 */

function searchy(xmlbasedir, prjbasedir) {

    // config search xml path and html project path
    if (xmlbasedir === undefined) { xmlbasedir = '_wikify'; }
    if (prjbasedir === undefined) { prjbasedir = '_wikify'; }

    // all data
    var ret = {
        xmlurl: xmlbasedir,
        prjurl: prjbasedir,
        xmlUrlSaved: xmlbasedir,
        prjUrlSaved: prjbasedir,
        post: {
            inputNode: "",
            outputNode: "",
            result: {},
        },
        code: {
            inputNode: "",
            outputNode: "",
            result: {},
        },
        note: {
            inputNode: "",
            outputNode: "",
            result: {},
        },
    };

    ret.restore = function() {
        ret.xmlurl = ret.xmlUrlSaved;
        ret.prjurl = ret.prjUrlSaved;
    }

    // init, reset
    ret.init = function() {
        // backup
        ret.xmlUrlSaved = ret.xmlurl;
        ret.prjUrlSaved = ret.prjurl;

        // init post search
        (function(inputNode, outputNode) {
            'use strict';
            var xmlPath = ret.xmlurl;
            xmlPath += xmlPath.endsWith("/") ? "search.post.xml" : "/search.post.xml";
            if (ret.xmlurl)
            var result = ret.post.result;
            $.ajax({
                url: xmlPath,
                dataType: "xml",
                success: function(xmlResponse) {
                    result.chunksize = $("search", xmlResponse).attr("chunksize");
                    result.entries = $("entry", xmlResponse).map(function() {
                        return {
                            index: $(this).attr("index"),
                            url: $("url", this).text(),
                            title: $("title", this).text(),
                            keywords: $("keywords", this).text(),
                            summary: $("summary", this).text(),
                        }
                    }).get();

                    var $input = document.getElementById(inputNode);
                    var $output = document.getElementById(outputNode);
                    $input.addEventListener('input', function() {
                        // clear
                        $output.innerHTML = "";

                        var queryString = this.value.trim();
                        if (queryString.length <= 0) { return; }

                        result.entries.forEach(function(data) {
                            var matched = false;
                            var text = data.title + data.keywords + data.summary;
                            var hit = text.toLowerCase().indexOf(queryString.toLowerCase());
                            if (hit >= 0) {
                                var $li = $('<li class="search-result-li"></li>').attr({
                                    index: data.index,
                                });
                                var $title = $('<a class="search-result-title"></a>').attr({
                                    href: ret.prjurl + '/' + data.url,
                                    target: '_blank',
                                }).text(data.title).appendTo($li);

                                var regS = new RegExp(queryString, "gi");
                                text = text.replace( regS, '<span class="search-keyword">'+queryString+'</span>');
                                $('<div class="search-result"></div>').html('... '+text+' ...').appendTo($li);
                                $li.appendTo($output);
                                $li.on('click', function() {
                                    var r = $(this).attr('index');
                                    var xmlFragPath = Math.floor(
                                        (result.chunksize-1+parseInt(r))/result.chunksize
                                    );
                                    xmlFragPath = xmlPath.substr(0, xmlPath.length-3) + xmlFragPath + ".xml";
                                    $.ajax({
                                        url: xmlFragPath,
                                        dataType: "xml",
                                        success: function (xmlResponse) {
                                            var $content = $("search > entry[index=" + r + "] > content", xmlResponse);
                                            var text = $content.text();
                                            // $li.html(text);
                                            // TODO: search inside!
                                        }
                                    });
                                });
                            }
                        });
                    });
                }
            });
        })(ret.post.inputNode, ret.post.outputNode);

        // init code search
        (function(inputNode, outputNode) {
            'use strict';
            var xmlPath = ret.xmlurl;
            xmlPath += xmlPath.endsWith("/") ? "search.code.xml" : "/search.code.xml";
            var result = ret.code.result;
            $.ajax({
                url: xmlPath,
                dataType: "xml",
                success: function(xmlResponse) {
                    result.chunksize = $("search", xmlResponse).attr("chunksize");
                    result.entries = $("entry", xmlResponse).map(function() {
                        if ($(this).attr("type") === "line code") {
                            return {
                                key: $("key", this).text(),
                                code: $("code", this).text(),
                            };
                        } else {
                            var refs = $("refs", this).text().substr(1);
                            refs = refs.substr(0, refs.length-1);
                            console.log(refs);
                            return {
                                key: $("key", this).text(),
                                refs: refs.split(","),
                            };
                        }
                    }).get();
                    JSON.stringify(result.entries);

                    var $input = document.getElementById(inputNode);
                    var $output = document.getElementById(outputNode);
                    $input.addEventListener('input', function() {
                        $output.innerHTML = ""; // clear
                        var refs = {};
                        var queryString = this.value.replace(/\s+/g, '').toLowerCase();
                        if (queryString.length <= 0) { return; }
                        result.entries.forEach(function(data) {
                            if (data.key.indexOf(queryString) >= 0) {
                                if ("refs" in data) {
                                    data.refs.forEach(function(ref) {
                                        refs[ref] = true;
                                    });
                                } else {
                                    $('<li class="search-result-li"></li>').html(data.code).appendTo($output);
                                }
                            }
                        });
                        for (var r in refs) {
                            var xmlFragPath = Math.floor(
                                (result.chunksize-1+parseInt(r))/result.chunksize
                            );
                            xmlFragPath = xmlPath.substr(0, xmlPath.length-3) + xmlFragPath + ".xml";
                            $.ajax({
                                url: xmlFragPath,
                                dataType: "xml",
                                success: function (xmlResponse) {
                                    var $content = $("search > entry[index="+r+"] > content", xmlResponse);
                                    var text = $content.text();
                                    var $code = $('<code></code>').attr({ class: "sourceCode " + $content.attr('lang') });
                                    var $pre = $('<pre></pre>').attr({ class: "sourceCode " + $content.attr('lang') });
                                    var $div = $('<div></div>').attr({ class: "sourceCode " + $content.attr('lang') });
                                    var $li = $('<li class="search-result-li"></li>').attr({ title: xmlFragPath + " (" + r + ")" });
                                    $code.html(text).appendTo($pre);
                                    $pre.appendTo($div);
                                    $div.appendTo($li);
                                    $li.appendTo($output);
                                }
                            });
                        }
                    });
                }
            });
        })(ret.code.inputNode, ret.code.outputNode);

        // init note search
        (function(inputNode, outputNode) {
            'use strict';
            var xmlPath = ret.xmlurl;
            xmlPath += xmlPath.endsWith("/") ? "search.note.xml" : "/search.note.xml";
            var result = ret.note.result;
            $.ajax({
                url: xmlPath,
                dataType: "xml",
                success: function(xmlResponse) {
                    result.chunksize = $("search", xmlResponse).attr("chunksize");
                    result.entries = $("entry", xmlResponse).map(function() {
                        return {
                            index: $(this).attr("index"),
                            url: $("url", this).text(),
                            title: $("title", this).text(),
                            headline: $("headline", this).text(),
                            keywords: $("keywords", this).text(),
                        }
                    }).get();

                    var $input = document.getElementById(inputNode);
                    var $output = document.getElementById(outputNode);
                    $input.addEventListener('input', function() {
                        // clear
                        $output.innerHTML = "";

                        var queryString = this.value.trim();
                        if (queryString.length <= 0) { return; }
                        result.entries.forEach(function(data) {
                            var matched = false;
                            var text = data.headline + data.keywords;
                            var hit = text.toLowerCase().indexOf(queryString.toLowerCase());
                            if (hit >= 0) {
                                var $li = $('<li class="search-result-li"></li>');
                                var $title = $('<a class="search-result-title"></a>').attr({
                                    href: ret.prjurl + '/' + data.url,
                                    target: '_blank',
                                }).text(data.title).appendTo($li);

                                var regS = new RegExp(queryString, "gi");
                                text = text.replace( regS, '<span class="search-keyword">'+queryString+'</span>');
                                var $div = $('<div class="search-result"></div>').html('... '+text+' ...').attr({
                                    title: data.title,
                                    url: data.url,
                                    index: data.index,
                                });
                                $div.appendTo($li);
                                $li.appendTo($output);
                                $div.on('click', function() {
                                    var r = $(this).attr('index');
                                    var xmlFragPath = Math.floor(
                                        (result.chunksize-1+parseInt(r))/result.chunksize
                                    );
                                    xmlFragPath = xmlPath.substr(0, xmlPath.length-3) + xmlFragPath + ".xml";
                                    $.ajax({
                                        url: xmlFragPath,
                                        dataType: "xml",
                                        success: function (xmlResponse) {
                                            var $content = $("search > entry[index=" + r + "] > content", xmlResponse);
                                            var text = $content.text();
                                            $div.html(text);
                                        }
                                    });
                                });
                            }
                        });
                    });
                }
            });
        })(ret.note.inputNode, ret.note.outputNode);
    };

    // config
    ret.configPostSearch = function(inputNode, outputNode)  { ret.post.inputNode = inputNode; ret.post.outputNode = outputNode; };
    ret.configCodeSearch = function(inputNode, outputNode)  { ret.code.inputNode = inputNode; ret.code.outputNode = outputNode; };
    ret.configNoteSearch = function(inputNode, outputNode)  { ret.note.inputNode = inputNode; ret.note.outputNode = outputNode; };

    return ret;
};
