<?php 
/**
 * Plugin Name: Taxonomies plugin
 * Plugin URI: http://test.com
 * Description: Plugin that registers Taxonomies
 * Version: 1.0.0
 * Authors: Red Academy Students.

 * License: GPL2
 */

if ( ! defined( 'WPINC' ) ) {
  die;
}


define( 'RF_DIR', dirname( __FILE__ ) );

include(RF_DIR. "/lib/post_tax.php");







 ?>