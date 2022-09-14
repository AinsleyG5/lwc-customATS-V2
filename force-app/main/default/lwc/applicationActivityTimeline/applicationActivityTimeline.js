import { LightningElement, wire, track, api } from 'lwc';

export default class ApplicationActivityTimeline extends LightningElement {
    @api taskAndEvent;
}