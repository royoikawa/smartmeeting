$( document ).ready(
    function () {
    // document.querySelector('.preview').function (btn) {
    //     btn.addEventListener('click', preview);
    // });

    //document.querySelector('#see').addEventListener('click', preview);
    window.addEventListener('pageshow', preview);

    

    function preview() {
        var btn = document.querySelector('#see');
        //console.log(evt);
        console.log(this);//同evt.target：<button id ='see' data-url='../minute/<%= rec_name %>' >預覽</button>
        var url = btn.dataset['url'];//data-url裡面的東西(url 是自己取的)
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

});

function displayResult(result) {
    document.getElementById("output").innerHTML = result.value;
}