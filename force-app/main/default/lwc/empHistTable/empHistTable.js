import { LightningElement, wire, track, api } from 'lwc';

export default class EmpHistTable extends LightningElement {
    @api empHistData;
    @api empHistId;
    @track modalContainer;
    
    @track columns = [
        {
            label: 'View',
            type: 'button-icon',
            initialWidth: 75,
            typeAttributes: {
                iconName: 'action:preview',
                title: 'Preview',
                variant: 'border-filled',
                alternativeText: 'View'
            }
        },
        // {
        //     label: 'Applicant',
        //     fieldName: 'linkName',
        //     type: 'url',
        //     typeAttributes: 
        //         {
        //             label: 
        //                 { 
        //                     fieldName: 'Applicant'
        //                 },
        //             target: '_blank'
        //         }
        // },
        {
            label: 'Title',
            fieldName: 'title',
            type: 'text',
            sortable: true
        },
        {
            label: 'Employer',
            fieldName: 'employer',
            type: 'text',
            sortable: true
        },
        {
            label: 'Start Date',
            fieldName: 'startDate',
            type: 'date',
            sortable: true
        },
        {
            label: 'End Date',
            fieldName: 'endDate',
            type: 'date',
            sortable: true
        },
        {
            label: 'Salary',
            fieldName: 'currentBase',
            type: 'text',
            sortable: true
        }
    ];

    connectedCallback() {
        console.log(`rendered in dom`);
    }

    handleRowAction(event) {
        const dataRow = event.detail.row;
        window.console.log(`event detail ==> `, dataRow.candId);
        window.console.log('dataRow@@ ' + dataRow);
        window.console.log('contactRow## ' + dataRow);
        this.modalContainer = true;

        this.empHistId = dataRow.Id;
        // Creates the event with the data.
        const selectedEvent = new CustomEvent("emphistorychange", {
            detail: this.empHistId
        });

        // Dispatches the event.
        this.dispatchEvent(selectedEvent);
    }
}