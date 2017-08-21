<?php
/* Plugin Name: Eventbrite to post

Plugin URI: http://wordpress.org/extend/plugins/test/
Version: 0.1
Author: cody collicott
Description: a plugin to create posts from events from eventbrite
Text Domain: test
License: GPLv3

*/

require_once("events_lib.php");
require_once("event_post.php");
require_once("event_build.php");

class event_call {

    public function event_auth () {
      $auth = array(
        'app_key'  => '3LFA7NU6UOG5MGDFCF',
        'user_key' => '1406578219109430733269'
      );
      return $auth;
    }
    public function get_events_data() {
      $eb_client = new Eventbrite( self::event_auth() );
      $events = $eb_client->user_list_events();
      return Eventbrite::eventData( $events, 'eventListRow');
    }
}
