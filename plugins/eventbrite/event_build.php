<?php

class event_build extends event_call {
  
  public function __construct(){
    $this->events = parent::get_events_data();
    self::build_event();
  }

  public function build_event () {
    
    foreach ($this->events->events as $event) {

      $event = $event->event;
      //echo "<pre>"; print_r($event); echo "</pre>";
      $ev = array();

      //if ($event->status == "Live") {

        /* General Info */

        $ev['title'] = $event->title;
        $ev['content'] = $event->description;
        $ev['events_meta_start_date'] = $event->start_date;
        $ev['events_meta_end_date'] = $event->end_date;
        $ev['events_meta_id'] = $event->id;

        /* Ticket Info */

        $ev['events_meta_ticket_price'] = $event->tickets[0]->ticket->price;
        $ev['events_meta_ticket_sold'] = $event->tickets[0]->ticket->quantity_sold;
        $ev['events_meta_ticket_avail'] = $event->tickets[0]->ticket->quantity_available;

        /* Address Info */

        $ev['events_meta_venue_city'] = $event->venue->city;
        $ev['events_meta_venue_name'] = $event->venue->name;
        $ev['events_meta_venue_country'] = $event->venue->country;
        $ev['events_meta_venue_address'] = $event->venue->address;
        $ev['events_meta_venue_lat'] = $event->venue->latitude;
        $ev['events_meta_venue_long'] = $event->venue->longitude;

        $post = new event_post;
        $post->event = $ev;
        $post->import_events();

      }
    //}
  }
}
