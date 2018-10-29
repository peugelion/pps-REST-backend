/* BEGIN themes switcher */

// *** TO BE CUSTOMISED ***
var style_cookie_name = "style" ;
var style_cookie_duration = 30 ;

$(document).ready(function() {
	$('#teme .button').on('click', function(){
		switch_style(this.value);
	    $(this).addClass('active')
				.siblings()
				.removeClass('active');
		return false;
	});

    var activeTheme = get_cookie( style_cookie_name ) ? get_cookie( style_cookie_name ) : 'default';
    $('#' +activeTheme).addClass('active');
});
// *** END OF CUSTOMISABLE SECTION ***

function switch_style ( css_title ) {
// https://www.thesitewizard.com/javascripts/change-style-sheets.shtml
  var i, link_tag ;
  for (i = 0, link_tag = document.getElementsByTagName("link") ;
    i < link_tag.length ; i++ ) {
    if ((link_tag[i].rel.indexOf( "stylesheet" ) != -1) &&
      link_tag[i].title) {
      link_tag[i].disabled = true ;
      if (link_tag[i].title == css_title) {
        link_tag[i].disabled = false ;
      }
    }
    set_cookie( style_cookie_name, css_title, style_cookie_duration );
  }
}
/* END themes switcher */

function set_cookie ( cookie_name, cookie_value, lifespan_in_days, valid_domain ) {
    // https://www.thesitewizard.com/javascripts/cookies.shtml
    var domain_string = valid_domain ?
                       ("; domain=" + valid_domain) : '' ;
    document.cookie = cookie_name +
                       "=" + encodeURIComponent( cookie_value ) +
                       "; max-age=" + 60 * 60 *
                       24 * lifespan_in_days +
                       "; path=/" + domain_string ;
}

function get_cookie(cookie_name) {
    var nameEQ = cookie_name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return '';
}

window.scrollTo(0,1); // android browser hide address bar fix