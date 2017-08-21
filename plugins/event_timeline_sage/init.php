<?php
/* Plugin Name: Event Timeline Sage

Plugin URI: http://wordpress.org/extend/plugins/test/
Version: 0.1
Author: cody collicott
Description: a plugin to create a time line via a shotcode
Text Domain: test
License: GPLv3

*/

if ( ! defined ( 'ABSPATH' ) ) {
	exit;
}
include ("timeline_lib.php");

function create_timeline( $atts ) {
    extract( shortcode_atts( array(
        'title' => 'your timeline',
        'tax' => '',
        'orientation' => 'verticle'
    ), $atts, 'multilink' ) );
    $t = new sage_timeline($atts);


}
add_shortcode( 'timeline', 'create_timeline' );
