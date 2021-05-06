import { Component, OnInit, ViewChild, ElementRef, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material'
import { FormGroup, Validators, FormBuilder, FormControl } from '@angular/forms'
import { AllocationService } from '../../services/allocation.service'

@Component({
  selector: 'ws-app-allocation-actions',
  templateUrl: './allocation-actions.component.html',
  styleUrls: ['./allocation-actions.component.scss'],
})
export class AllocationActionsComponent implements OnInit {

  @ViewChild('childNodes', { static: false })
  inputvar!: ElementRef
  tabsData!: any[]
  userslist!: any[]
  currentTab = 'officer'
  sticky = false
  formdata = {
    fname: '',
    email: '',
    position: '',
    rolelist: [
      {
        name: '',
        childNodes: '',
      },
    ],
  }
  similarUsers!: any[]
  nosimilarUsers = false
  similarRoles!: any[]
  nosimilarRoles = false
  similarPositions!: any[]
  nosimilarPositions = false
  similarActivities!: any[]
  nosimilarActivities = false
  similarCompetencies!: any[]
  nosimilarCompetencies = false
  selectedRole: any
  selectedActivity: any
  selectedPosition: any
  selectedCompetency: any
  ralist: any[] = []
  departmentName: any
  departmentID: any
  showRAerror = false
  allocationFieldForm: FormGroup

  activitieslist: any[] = []
  selectedTabIndex = 0
  competencieslist: any[] = []
  compatecnyLevel: any

  constructor(
    private allocateSrvc: AllocationService,
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AllocationActionsComponent>,
    @Inject(MAT_DIALOG_DATA) public selectedUser: any
  ) {

    this.compatecnyLevel = ''
    this.allocationFieldForm = this.fb.group({
      role: ['', Validators.required],
      roleDesc: [''],
      mapActivities: ['', Validators.required],
      mapCompetencies: ['', Validators.required],
      compDesc: [''],
      compArea: [''],
      compLevel: ['', Validators.required],
      rolelist: this.fb.array([this.newRole()]),
      competency: ['', Validators.required],
    })
  }

  ngOnInit() {
  }

  newRole(): FormGroup {
    return this.fb.group({
      name: new FormControl(''),
      childNodes: new FormControl(''),
    })
  }

  close(): void {
    this.dialogRef.close()
  }

  // to get suggested similar roles in right sidebar
  onSearchRole(event: any) {
    const val = event.target.value
    if (val.length > 2) {
      this.displayLoader('true')
      this.nosimilarRoles = false
      this.similarUsers = []
      this.similarRoles = []
      this.similarActivities = []
      this.similarPositions = []
      this.allocateSrvc.onSearchRole(val).subscribe((res: any) => {
        if (res !== undefined) {
          this.similarRoles = []
          res.forEach((obj: any) => {
            const roleObj = {
              type: obj.type,
              name: obj.name,
              description: obj.description,
              status: obj.status,
              source: obj.source,
              childNodes: (obj.childNodes && obj.childNodes.length > 0) ? obj.childNodes : []
            }
            this.similarRoles.push(roleObj)
          })
        }
        this.displayLoader('false')
        if (this.similarRoles && this.similarRoles.length === 0) {
          this.nosimilarUsers = false
          this.nosimilarRoles = true
          this.nosimilarPositions = false
          this.nosimilarActivities = false
        } else {
          this.setAllMsgFalse()
        }
      })
    }
  }

  onSearchCompetency(event: any) {
    const val = event.target.value
    if (val.length > 2) {
      this.displayLoader('true')
      this.nosimilarRoles = false
      this.similarUsers = []
      this.similarRoles = []
      this.similarActivities = []
      this.similarPositions = []
      this.similarCompetencies = []
      this.allocateSrvc.onSearchCompetency(val).subscribe(res => {
        this.similarCompetencies = res.responseData
        this.displayLoader('false')
        if (this.similarCompetencies && this.similarCompetencies.length === 0) {
          this.nosimilarUsers = false
          this.nosimilarRoles = true
          this.nosimilarPositions = false
          this.nosimilarActivities = false
          this.nosimilarCompetencies = false
        } else {
          this.setAllMsgFalse()
        }
      })
    }
  }

  displayLoader(value: any) {
    // tslint:disable-next-line:no-non-null-assertion
    const vart = document.getElementById('loader')!
    if (value === 'true') {
      vart.style.display = 'block'
    } else {
      vart.style.display = 'none'
    }
  }

  setAllMsgFalse() {
    this.nosimilarUsers = false
    this.nosimilarRoles = false
    this.nosimilarPositions = false
    this.nosimilarActivities = false
  }

  selectRole(role: any) {
    const selectedRole = this.similarRoles.filter(roleObj => roleObj.name === role.name)
    const selectedRoleObj = {
      type: selectedRole[0].type,
      name: selectedRole[0].name,
      description: selectedRole[0].description,
      status: selectedRole[0].status,
      childNodes: selectedRole[0].childNodes
    }
    this.selectedRole = selectedRoleObj
    this.activitieslist = this.selectedRole.childNodes
    this.similarRoles = []
    this.selectedActivity = ''
    if (selectedRole) {
      this.allocationFieldForm.controls['role'].setValue(this.selectedRole.name)
      this.allocationFieldForm.controls['roleDesc'].setValue(this.selectedRole.description)
    }
  }

  selectCompetency(comp: any) {

    if (comp !== undefined) {
      this.selectedCompetency = []
      const selectedCompetencyObj = {
        type: comp.type,
        id: comp.id,
        name: comp.name,
        description: comp.description,
        status: comp.status,
        childNodes: comp.childNodes,
        source: comp.source,
        reviewComments: comp.reviewComments,
        createdDate: comp.createdDate,
        additionalProperties: comp.additionalProperties,
        children: comp.children
      }
      this.selectedCompetency.push(selectedCompetencyObj)
      this.allocationFieldForm.controls['competency'].setValue(this.selectedCompetency[0].name)
      this.allocationFieldForm.controls['compDesc'].setValue(this.selectedCompetency[0].description)
      this.allocationFieldForm.controls['compArea'].setValue(this.selectedCompetency[0].additionalProperties.competencyArea)
    }
  }

  get newroleControls() {
    const rl = this.allocationFieldForm.get('rolelist')
    return (<any>rl)['controls']
  }

  tabChange() {

    if (this.selectedTabIndex === 0) {
      if (this.allocationFieldForm.controls['role'].value !== '') {
        this.selectedTabIndex = 1
      }
    } else if (this.selectedTabIndex === 1) {
      this.selectedTabIndex = 2
    }
  }

  onSearchActivity(event: any) {
    const val = event.target.value
    if (val.length > 2) {
      this.displayLoader('true')
      this.nosimilarActivities = false
      this.similarUsers = []
      this.similarRoles = []
      this.similarActivities = []
      this.similarPositions = []
      const req = {
        searches: [
          {
            type: 'ACTIVITY',
            field: 'name',
            keyword: val,
          },
          {
            type: 'ACTIVITY',
            field: 'status',
            keyword: 'VERIFIED',
          },
        ],
      }
      this.allocateSrvc.onSearchActivity(req).subscribe(res => {
        this.similarActivities = res.responseData
        this.displayLoader('false')
        if (this.similarActivities && this.similarActivities.length === 0) {
          this.nosimilarUsers = false
          this.nosimilarRoles = false
          this.nosimilarPositions = false
          this.nosimilarActivities = true
        } else {
          this.setAllMsgFalse()
        }
      })
    }
  }

  selectActivity(activity: any) {
    this.selectedActivity = activity
    this.similarActivities = []
    this.allocationFieldForm.controls['mapActivities'].setValue(activity.name)
    // this.activitieslist.push(activity)
    this.selectedActivity = activity
  }

  mapSelectedActivity() {
    const activitiyObj = {
      name: this.allocationFieldForm.controls['mapActivities'].value,
      desc: (this.selectedActivity.description !== '') ? this.selectedActivity.description : '',
      id: (this.selectedActivity.id !== '') ? this.selectedActivity.id : '',
      status: '',
      parentRole: '',
      type: '',
    }
    this.activitieslist.push(activitiyObj)
  }

  showRemoveActivity(index: any) {
    const id = `showremove${index}`
    // tslint:disable-next-line:no-non-null-assertion
    const vart = document.getElementById(id)!
    vart.style.display = 'block'
  }

  removeActivity(index: any) {
    if (index >= 0) {
      this.activitieslist.splice(index, 1)
    }
  }

  buttonClick(action: string, row: any) {
    if (this.ralist) {
      if (action === 'Delete') {
        const index = this.ralist.indexOf(row)
        if (index >= 0) {
          this.ralist.splice(index, 1)
        }
      }
    }
  }

  selectLevel(selectedLevel: string) {
    this.compatecnyLevel = selectedLevel
    this.allocationFieldForm.controls['compLevel'].setValue(selectedLevel)
  }

  mapSelectedCompetency() {
    if (this.compatecnyLevel === '') {
      // document.getElementById('level-msg').style.display = 'block'
    } else {
      const competencyObj = {
        name: this.allocationFieldForm.controls['competency'].value,
      }
      this.competencieslist.push(competencyObj)
    }

  }

  saveWorkOrder() {
    delete this.selectedCompetency['childCount']
    const roleCompetencyArr = []
    const roleCompetencyObj = {
      roleDetails: this.selectedRole,
      competencyDetails: this.selectedCompetency
    }
    roleCompetencyArr.push(roleCompetencyObj)

    const reqdata = {
      id: this.selectedUser ? this.selectedUser.userData.userDetails.wid : '',
      userId: this.selectedUser ? this.selectedUser.userData.userDetails.wid : '',
      userName: `${this.selectedUser.userData.userDetails.first_name} ${this.selectedUser.userData.userDetails.last_name}`,
      userEmail: this.selectedUser.userData.userDetails.email,
      deptId: this.selectedUser.department_id,
      deptName: this.selectedUser.department_name,
      roleCompetencyList: roleCompetencyArr,
      userPosition: this.allocationFieldForm.value.position,
      positionId: this.selectedPosition ? this.selectedPosition.id : '',
      status: 'Draft',
      waId: ''
    }

    this.allocateSrvc.createAllocation(reqdata).subscribe(res => {
      if (res) {
        this.allocationFieldForm.reset()
        this.selectedUser = ''
        this.dialogRef.close({ event: 'close', data: reqdata })
      }
    })
  }

}
