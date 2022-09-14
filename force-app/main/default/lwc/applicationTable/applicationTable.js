import { LightningElement, wire, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateRecord } from 'lightning/uiRecordApi';
// Standard Apex
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import { refreshApex } from '@salesforce/apex';
// Field Import
import NAME_FIELD from "@salesforce/schema/Contact.Name";
import ID_FIELD from '@salesforce/schema/TR1__Application_V2__c.Id';
import STAGE_FIELD from '@salesforce/schema/TR1__Application_V2__c.TR1__Stage__c';
// Apex Imports
import getJobApps from '@salesforce/apex/getApplicationsV2.getApps';
import getTasks from '@salesforce/apex/getCandidateTasks.getTasks';
import getEvents from '@salesforce/apex/getCandidateNotes.getEvents';
import getJobTasks from '@salesforce/apex/getJobCandidateTasks.getTasks';
import getEmpHist from '@salesforce/apex/getEmploymentHistory.getEmpHistory';
import updateApplication from '@salesforce/apex/getApplicationsV2.updateApplication';
import getMarketIntelligence from '@salesforce/apex/getMarketIntelligence.getMI';
import getBasicContactData from '@salesforce/apex/getBasicContactData.getContact';

const fields = [NAME_FIELD];

export default class Onb365DataTable extends LightningElement {
    @api recordId;
    @track jobAppData;
    @track contactRow = {};
    @track rowOffset = 0;  
    @track modalContainer = false;
    @track candId;
    @track applicantName;
    @track appId;
    @track appStage;
    @track showTab1 = false;
    @track showTab2 = false;
    @track noJobNoteData;
    @track noMIData;
    @track filterOptions = ['--All--', 'Owned by me', 'Prospects', 'Candidates'];
    @track options = [];
    @track selectedValue;
    @track quickPromoteState = true;
    @track loading = false;
    @track hidden = true;
    @track rraRoleValues = ['PR', 'PP', 'CA', 'xPP', 'xPR', 'xCA','xSC'];
    @track empHistId;
    @track atsStages = ['Application', 'Screening', 'Assessment', 'Send Out', 'Verification', 'Offer', 'Closing Report', 'Candidate Presented', 'Sign-off'];
    @track justCandIDs = [];
    @api tasks;
    @api events;
    @api error;
    @api tasksAndEvents;
    @api marketIntelligence

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
    {
        label: 'Role',
        fieldName: 'role',
        type: 'text',
        sortable: true
    },
    {
        label: 'O/L',
        fieldName: 'offLimits',
        type: 'text',
        sortable: true
    },
    {
        label: 'Rank',
        fieldName: 'rank',
        type: 'text',
        sortable: true
    },
    {
        label: 'Stage',
        fieldName: 'Stage',
        type: 'text',
        sortable: true
    },
    {
        label: 'Candidate',
        fieldName: 'linkName',
        type: 'url',
        typeAttributes: 
            {
                label: 
                    { 
                        fieldName: 'Applicant'
                    },
                target: '_blank'
            }
    },
    {
        label: 'Current Title',
        fieldName: 'currentTitle',
        type: 'text',
        sortable: true
    },
    {
        label: 'Current Employer',
        fieldName: 'employerLinkName',
        type: 'url',
        typeAttributes: 
            {
                label: 
                    { 
                        fieldName: 'currentEmployer'
                    },
                target: '_blank'
            }
    },
    {
        label: 'Current Comp',
        fieldName: 'currentComp',
        type: 'text',
        sortable: true
    }
];

    connectedCallback() {
        console.log(this.recordId);
        let optionsValues = [];
        for(let i = 0; i < this.filterOptions.length; i++) {
            optionsValues.push({
                label: this.filterOptions[i],
                value: this.filterOptions[i]
            })
        }
        this.options = optionsValues;
    }

    // @wire(getBasicContactData, { recordId: '$candId' })
    // returnedData({data, error}) {
    //     if(data) {
    //         console.log(`Initial data from getBasicContactData: `, data);
    //         // let person = data[0];
    //         // let {id, candidateName} = person;
    //         // console.log(`Candidate Name ==> `, candidateName);
    //         // this.applicantName = candidateName;
    //     } else if (error) {
    //         console.log(`Candidate data returned error ==> `, error);
    //         this.error = error;
    //     }
    // }

    @wire(getBasicContactData, {recordId: '$candId'})
    returnedContactData({data, error}) {
        if(data) {
            console.log(`Data returned from getBasicContactData: `, data);
            this.applicantName = data[0].Name;
        } else if(error) {
            this.error = error;
            console.log(`getBasicContactData Error ===> `, error);
        }
    }

    refreshApp() {
        return refreshApex(this.getJobApps);
    }

    updateApplicationButton(event){
        if(this.candId && this.appId) {
            this.loading = true;

            let buttonName = event.currentTarget.dataset.name;

            let stageUpdateIndex = (buttonName == 'promote') ?  this.atsStages.indexOf(this.appStage) + 1 : this.atsStages.indexOf(this.appStage) - 1;
            let stageUpdateValue = this.atsStages[stageUpdateIndex]; 

            const fields = {};
            fields[ID_FIELD.fieldApiName] = this.appId;
            fields[STAGE_FIELD.fieldApiName] = stageUpdateValue;

            const recordInput = {
                fields
            };

            updateRecord(recordInput)
                    .then(() => {
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: 'Success',
                                message: 'Application updated',
                                variant: 'success'
                            })
                        );
                        this.loading = false;
                        return refreshApex(this.getJobApps);
                    })
                    .catch(error => {
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: 'Error Updating record',
                                message: error.body.message,
                                variant: 'error'
                            })
                        );
                        this.loading = false;
                    });
        }
    }

    tabNextCandidate(event) {
        console.log(`Button pressed ==> `, event.currentTarget.dataset.name);
        let buttonPressed = event.currentTarget.dataset.name;
        let indexNumber = (buttonPressed == 'back') ? this.justCandIDs.indexOf(this.candId) - 1 : this.justCandIDs.indexOf(this.candId) + 1;
        console.log(`indexNumber `, this.justCandIDs.indexOf(this.candId));
        let newCandId = this.justCandIDs[indexNumber];
        console.log(`new CandId ==> `, newCandId);
        this.candId = newCandId;
    }

    @wire(getJobApps, {recordId: '$recordId', rraRoleValues: '$rraRoleValues'})
    returnedData({data, error}) {
        if(data) {
            let flattenedDatas = [];
            data.forEach( element => {
                let flattenedData = {};
                flattenedData.Id = element.Id;
                flattenedData.Stage = element.TR1__Stage__c;
                flattenedData.candId = element.TR1__Applicant__c;
                flattenedData.linkName = '/' + element.TR1__Applicant__c;
                flattenedData.Applicant = element.TR1__Applicant__r.Name;
                flattenedData.currentTitle = element.TR1__Applicant__r.Title;
                flattenedData.Email = element.TR1__Applicant__r.Email;
                flattenedData.offLimits = element.OffLimits__c;
                flattenedData.role = element.Role__c;
                flattenedData.rank = element.Rank__c;
                flattenedData.currentComp = element.TR1__Applicant__r.TR1__Current_Last_Salary__c;
                flattenedData.employerLinkName = (element.TR1__Applicant__r.Current_Employer__c) ? '/' + element.TR1__Applicant__r.Current_Employer__c: null;
                flattenedData.currentEmployer = (element.TR1__Applicant__r.Current_Employer__c) ? element.TR1__Applicant__r.Current_Employer__c: null;
                flattenedData.createdLinkName = '/' + element.CreatedById;
                flattenedData.createdBy = element.CreatedBy.FirstName + ' ' + element.CreatedBy.LastName;
                flattenedDatas.push(flattenedData);
            });
            this.jobAppData = flattenedDatas;
            this.justCandIDs = this.jobAppData.map( e => {
                return e.candId;
            })
            console.log(`Cand Apps Returned: `, data);
            console.log(`Just CandIds: `, this.justCandIDs);
        } else if (error) {
            console.log(`Errors ===> `, error);
        }
    };

    handleRowAction(event) {
        this.quickPromoteState = false;
        const dataRow = event.detail.row;
        window.console.log(`event detail ==> `, dataRow.candId);
        window.console.log('dataRow@@ ' + JSON.stringify(dataRow));
        this.contactRow = dataRow;
        window.console.log('contactRow## ' + dataRow);
        this.candId = dataRow.candId;
        this.appId = dataRow.Id;
        this.appStage = dataRow.Stage;
        this.applicantName = dataRow.Applicant;
        this.modalContainer = true;
    }

    // Handling on change value
    handleChange(event) {
        this.selectedValue = event.detail.value;
        console.log(`Selected Value ==> `, this.selectedValue);
        switch (this.selectedValue) {
            case '--All--':
                this.rraRoleValues = ['PR', 'PP', 'CA', 'xPP', 'xPR', 'xCA','xSC'];
                break;
            case 'Candidates':
                this.rraRoleValues = ['CA'];
                break;
            case 'Prospects':
                this.rraRoleValues = ['PR'];
                break;
            default:
                this.rraRoleValues = ['PR', 'PP', 'CA', 'xPP', 'xPR', 'xCA','xSC'];
                break;
        }
    }

    handleCloseClick(){
        this.dispatchEvent(new CustomEvent('close'));
        this.modalContainer = false;
        this.hidden = true;
    }
   
    closeModalAction(){
      this.modalContainer = false;
      this.hidden = true;
      this.candId = null;
      this.appId = null;
      this.quickPromoteState = false;
    }

    @wire(getJobTasks, {recordId: '$candId', jobId: '$recordId'})
    returnedJobTasks({data, error}) {
        if(data) {
            if(data.length > 0) {
                console.log(`Job notes for candidate: `, data);
                this.jobNotes = data;
                this.noJobNoteData = null;
                if(this.jobNotes) {
                    this.showTab1 = true;
                }
            } else {
                this.jobNotes = null;
                this.showTab1 = true;
                this.noJobNoteData = `No assignment notes found for this candidate.`;
            }
        } else if (error) {
            this.error = error;
            console.log(`Job tasks returned error ===> `, error);
        }
    }

    @wire(getTasks, {recordId: '$candId'})
    returnedTaskData({data, error}) {
        if(data) {
            console.log(`Data returned from getTasks: `, data);
            this.tasks = data;
            if(this.tasks && this.events) {
                this.doProcessing(this.events, this.tasks);
            }
        } else if(error) {
            this.error = error;
            console.log(`getTasks Error ===> `, error);
        }
    }

    @wire(getEvents, {recordId: '$candId'})
    returnedEventData({data, error}) {
        if(data) {
            console.log(`Data returned from getEvents: `, data);
            this.events = data;
            if(this.tasks && this.events) {
                this.doProcessing(this.events, this.tasks);
            }
        } else if(error) {
            this.error = error;
            console.log(`getEvents Error ===> `, error);
        }
    }

    @wire(getMarketIntelligence, {recordId: '$candId'})
    returnedMarketIntelligenceData({data, error}) {
        if(data) {
            if(data.length > 0) {
                console.log(`Data returned from getMarketIntelligence: `, data);
                this.marketIntelligence = data;
                this.noMIData = null;
                if(this.marketIntelligence) {
                    this.showTab0 = true;
                }
            } else {
                this.marketIntelligence = null;
                this.showTab0 = true;
                this.noMIData = `No market intelligence for this candidate, you can add MI by visiting the candidates record.`
            }
        } else if(error) {
            this.error = error;
            console.log(`getMarketIntelligence Error ===> `, error);
        }
    }

    @wire(getEmpHist, {recordId: '$candId'})
    returnedEmpHistData({data, error}) {
        if(data) {
            console.log(`Data returned from getEmpHist ===> `, data);
            let flattenedDatas = [];
                data.forEach( element => {
                        let flattenedData = {};
                        flattenedData.Id = element.Id;
                        flattenedData.candId = element.TR1__Contact__c;
                        flattenedData.linkName = '/' + element.TR1__Contact__c;
                        flattenedData.Applicant = element.TR1__Contact__r.Name;
                        flattenedData.employer = element.TR1__EmployerName__c;
                        flattenedData.title = element.TR1__Title__c;
                        flattenedData.startDate = element.TR1__Start_date__c;
                        flattenedData.endDate = element.TR1__End_date__c;
                        flattenedData.currentBase = element.Base_Salary__c;
                        flattenedData.verified = element.TR1__Verified__c;
                        flattenedDatas.push(flattenedData);
                    });
                    //this.applicantName = this.flattenedDatas[0].Applicant;
                    this.empHist = flattenedDatas;
                    console.log(`Value of empHist`, this.empHist);
        } else if(error) {
            this.error = error;
            console.log(`getEmpHist Error ===> `, error);
        }
    }

    doProcessing(events, tasks) {
        if(events && tasks) {
            this.tasksAndEvents = events.concat(tasks)
            console.log(`Concatted result: `, events.concat(tasks));
        }
    }

    tabClick(event) {
        var activeTab = event.target.value;
        console.log(`Tab clicked event detail: `, activeTab);

        switch (activeTab) {
            case '0':
                if(this.marketIntelligence) {
                    this.showTab0 = true;
                    this.showTab1 = false;
                    this.showTab2 = false;
                    break;
                } else {
                    break;
                }
            case '1':
                if(this.jobNotes) {
                    this.showTab0 = false;
                    this.showTab1 = true;
                    this.showTab2 = false;
                    console.log(`Tab 1 Clicked`);
                    break;
                } else {
                    break;
                }
            case '2':
                this.showTab0 = false;
                this.showTab1 = false;
                this.showTab2 = true;
                console.log(`Tab 2 Clicked`);
                break;
            case '3':
                // getEmpHist({recordId: this.candId}).then( res => {
                //     console.log(`Value of Emp History call`, res);
                //     let flattenedDatas = [];
                //     res.forEach( element => {
                //         let flattenedData = {};
                //         flattenedData.Id = element.Id;
                //         flattenedData.candId = element.TR1__Contact__c;
                //         flattenedData.linkName = '/' + element.TR1__Contact__c;
                //         flattenedData.Applicant = element.TR1__Contact__r.Name;
                //         flattenedData.employer = element.TR1__EmployerName__c;
                //         flattenedData.title = element.TR1__Title__c;
                //         flattenedData.startDate = element.TR1__Start_date__c;
                //         flattenedData.endDate = element.TR1__End_date__c;
                //         flattenedData.verified = element.TR1__Verified__c;
                //         flattenedDatas.push(flattenedData);
                //     });
                //     this.empHist = flattenedDatas;
                //     console.log(`Value of empHist`, this.empHist);
                //     return(this.empHist);
                // })
                console.log(`Tab 3 clicked`);
                break;
            default:
                break;
        }
    }

    handleEmpHistoryChange(event) {
        this.empHistId = event.detail;
        console.log(`EmpHistchange in Parent: `, this.empHistId);
      }

}