import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core'
import { TrainingPlanDataSharingService } from '../../services/training-plan-data-share.service'
@Component({
  selector: 'ws-app-user-card',
  templateUrl: './user-card.component.html',
  styleUrls: ['./user-card.component.scss'],
})
export class UserCardComponent implements OnInit {
  @Input() checkboxVisibility = true;
  @Input() showDeleteFlag = false;
  @Input() assigneeData: any;
  @Output() handleSelectedChips = new EventEmitter();
  constructor(private trainingPlanDataSharingService: TrainingPlanDataSharingService) { }

  ngOnInit() {
  }

  selectAssigneeItem(event: any, item: any) {
    if (event.checked) {
      // this.selectedContent.push(item);
      if(this.assigneeData && this.assigneeData.category === 'Designation') {
        this.trainingPlanDataSharingService.trainingPlanAssigneeData.data.map((sitem: any, index: any) => {
          if (sitem.id === item.id) {
            sitem['selected'] = true
            this.trainingPlanDataSharingService.trainingPlanAssigneeData.data.splice(index, 1)
            this.trainingPlanDataSharingService.trainingPlanAssigneeData.data.unshift(sitem)
          }
        })
        if (this.trainingPlanDataSharingService.trainingPlanStepperData['assignmentTypeInfo']) {
          this.trainingPlanDataSharingService.trainingPlanStepperData['assignmentTypeInfo'].push(item.id)
        }
      }
      if(this.assigneeData && this.assigneeData.category === 'Custom Users') {
        this.trainingPlanDataSharingService.trainingPlanAssigneeData.data.content.map((sitem: any, index: any) => {
          if (sitem.userId === item.userId) {
            sitem['selected'] = true
            this.trainingPlanDataSharingService.trainingPlanAssigneeData.data.content.splice(index, 1)
            this.trainingPlanDataSharingService.trainingPlanAssigneeData.data.content.unshift(sitem)
          }
        })
        if (this.trainingPlanDataSharingService.trainingPlanStepperData['assignmentTypeInfo']) {
          this.trainingPlanDataSharingService.trainingPlanStepperData['assignmentTypeInfo'].push(item.userId)
        }
      }
      
    } else {
      // this.selectedContent = this.selectedContent.filter( sitem  => sitem.identifier !== item.identifier)
      if(this.assigneeData && this.assigneeData.category === 'Designation') {
        this.trainingPlanDataSharingService.trainingPlanAssigneeData.data.map((sitem: any) => {
          if (sitem.id === item.id) {
            sitem['selected'] = false
          }
        })
        this.trainingPlanDataSharingService.trainingPlanStepperData['assignmentTypeInfo'].filter((identifier: any, index: any) => {
          if (identifier === item.id) {
            this.trainingPlanDataSharingService.trainingPlanStepperData['assignmentTypeInfo'].splice(index, 1)
          }
        })
      } 
      if(this.assigneeData && this.assigneeData.category === 'Custom Users') {
        this.trainingPlanDataSharingService.trainingPlanAssigneeData.data.content.map((sitem: any) => {
          if (sitem.userId === item.userId) {
            sitem['selected'] = false
          }
        })
        this.trainingPlanDataSharingService.trainingPlanStepperData['assignmentTypeInfo'].filter((identifier: any, index: any) => {
          if (identifier === item.userId) {
            this.trainingPlanDataSharingService.trainingPlanStepperData['assignmentTypeInfo'].splice(index, 1)
          }
        })
      }
      
    }
    this.handleSelectedChips.emit(true)
  }

  deleteItem(item:any) {
    console.log('item', item);
    if(this.assigneeData && this.assigneeData.category === 'Designation') {
      this.trainingPlanDataSharingService.trainingPlanAssigneeData.data.map((sitem: any) => {
        if (sitem.id === item.id) {
          sitem['selected'] = false
        }
      })
      this.assigneeData.data.map((sitem: any, index:any) => {
        if (sitem.id === item.id) {
          this.assigneeData.data.splice(index, 1)
        }
      })
      this.trainingPlanDataSharingService.trainingPlanStepperData['assignmentTypeInfo'].filter((identifier: any, index: any) => {
        if (identifier === item.id) {
          this.trainingPlanDataSharingService.trainingPlanStepperData['assignmentTypeInfo'].splice(index, 1)
        }
      })
    } else if(this.assigneeData && this.assigneeData.category === 'Custom Users') {
      this.trainingPlanDataSharingService.trainingPlanAssigneeData.data.map((sitem: any) => {
        if (sitem.userId === item.userId) {
          sitem['selected'] = false
        }
      })
      this.assigneeData.data.map((sitem: any, index:any) => {
        if (sitem.userId === item.userId) {
          this.assigneeData.data.splice(index, 1)
        }
      })
      this.trainingPlanDataSharingService.trainingPlanStepperData['assignmentTypeInfo'].filter((identifier: any, index: any) => {
        if (identifier === item.userId) {
          this.trainingPlanDataSharingService.trainingPlanStepperData['assignmentTypeInfo'].splice(index, 1)
        }
      })
    }
    
  }

}