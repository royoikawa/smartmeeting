(function () {
    // document.getElementById("document")
    //     .addEventListener("change", handleFileSelect, false);
    document.querySelectorAll('.preview').forEach(function (btn) {
        btn.addEventListener('click', preview);
    });

    function handleFileSelect(event) {
        readFileInputEventAsArrayBuffer(event, function (arrayBuffer) {
            mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
                .then(displayResult)
                .done();
        });
    }

    function displayResult(result) {
        document.getElementById("output").innerHTML = result.value;
    }

    function readFileInputEventAsArrayBuffer(event, callback) {
        //event.target.files[0].name = "案三資料.docx";
        var file = event.target.files[0];
        console.log("file:");
        console.log(file);
        console.log("event:");
        console.log(event);
        var reader = new FileReader();
        console.log("callback:" + callback);
        reader.onload = function (loadEvent) {
            console.log("loadEvent:");
            console.log(loadEvent);
            var arrayBuffer = loadEvent.target.result;
            console.log("arrayBuffer");
            console.log(arrayBuffer);
            callback(arrayBuffer);
        };
        reader.readAsArrayBuffer(file);
        console.log("1");
    }
    function preview(evt) {
        var btn = evt.target;
        console.log(evt);
        var url = btn.dataset['url'];
        console.log(url);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'arraybuffer';
        xhr.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    var arrayBuffer = this.response;
                    mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
                        .then(displayResult)
                        .done();
                    console.log(arrayBuffer);
                } else {
                    console.log(this.status);
                }
            }
        }
        xhr.send();
    }

})();