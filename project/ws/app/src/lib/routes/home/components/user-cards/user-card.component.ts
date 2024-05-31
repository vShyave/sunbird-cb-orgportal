import { Component, EventEmitter, Input, OnChanges, OnInit, Output, QueryList, TemplateRef, ViewChild, ViewChildren } from '@angular/core'
import { FormGroup, FormControl, Validators } from '@angular/forms'
import { UsersService } from '../../../users/services/users.service'
import {
  DateAdapter, MAT_DATE_FORMATS, MatChipInputEvent, MatDialog,
  MatExpansionPanel, MatPaginator, MatSnackBar, PageEvent,
} from '@angular/material'
import { COMMA, ENTER } from '@angular/cdk/keycodes'
// tslint:disable-next-line
import _ from 'lodash'
import { RolesService } from '../../../users/services/roles.service'
import { ActivatedRoute } from '@angular/router'
import { Observable, Subscription } from 'rxjs'
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators'
import { environment } from '../../../../../../../../../src/environments/environment'
// import { OtpService } from '../../../users/services/otp.service'
// import { ConfigurationsService } from '@sunbird-cb/utils'
// import { RejectionPopupComponent } from '../rejection-popup/rejection-popup.component'
import { APP_DATE_FORMATS, AppDateAdapter } from '../../../events/routes/format-datepicker'
import { ApprovalsService } from '../../services/approvals.service'
import { EventService } from '@sunbird-cb/utils'
import { TelemetryEvents } from '../../../../head/_services/telemetry.event.model'

@Component({
  selector: 'ws-widget-user-card',
  templateUrl: './user-card.component.html',
  styleUrls: ['./user-card.component.scss'],
  providers: [
    { provide: DateAdapter, useClass: AppDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: APP_DATE_FORMATS },
  ],
})
export class UserCardComponent implements OnInit, OnChanges {
  @Input() userId: any
  @Input() tableData: any
  @Input() usersData: any
  @Input() totalRecords: any
  @Input() tabChangeIndex: any
  @Input() currentFilter: any
  @Input() isApprovals: any

  @Output() paginationData = new EventEmitter()
  @Output() searchByEnterKey = new EventEmitter()
  @Output() disableButton = new EventEmitter()
  @Output() updateList = new EventEmitter()
  @ViewChildren(MatExpansionPanel) panels!: QueryList<MatExpansionPanel>

  @ViewChild('rejectDialog', { static: false })
  rejectDialog!: TemplateRef<any>
  @ViewChild('updaterejectDialog', { static: false })
  updaterejectDialog!: TemplateRef<any>

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator | any
  startIndex = 0
  lastIndex = 20
  pageSize = 20

  userStatus: any
  rolesList: any = []
  rolesObject: any = []
  uniqueRoles: any = []
  public userRoles: Set<string> = new Set()
  orguserRoles: any = []
  isMdoAdmin = false
  isMdoLeader = false
  isBoth = false
  updateUserDataForm: FormGroup
  approveUserDataForm: FormGroup
  designationsMeta: any = []
  groupsList: any = []
  selectedtags: any[] = []
  reqbody: any
  isTagsEdited = false
  separatorKeysCodes: number[] = [ENTER, COMMA]
  namePatern = `^[a-zA-Z ]*$`
  orgTypeList: any = []
  // public countryCodes: string[] = []
  masterLanguages: Observable<any[]> | undefined
  masterLanguagesEntries: any
  genderList = ['Male', 'Female', 'Others']
  categoryList = ['General', 'OBC', 'SC', 'ST']
  // needApprovalList: any[] = []
  profileData: any[] = []
  userwfData!: any
  comment = ''
  listupdateFieldValues: any[] = []
  actionList: any = []

  phoneNumberPattern = '^((\\+91-?)|0)?[0-9]{10}$'
  emailRegix = `^[\\w\-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$`
  pincodePattern = '(^[0-9]{6}$)'
  yearPattern = '(^[0-9]{4}$)'
  empIDPattern = `^[a-z0-9]+$`

  userGroup: any

  otpSend = false
  otpVerified = false
  OTP_TIMER = environment.resendOTPTIme
  timerSubscription: Subscription | null = null
  timeLeftforOTP = 0
  isMobileVerified = false
  disableVerifyBtn = false
  qpParam: any
  department: any
  approvalData: any
  showeditText = false
  today = new Date()

  constructor(private usersSvc: UsersService, private roleservice: RolesService,
              private dialog: MatDialog, private approvalSvc: ApprovalsService,
              private route: ActivatedRoute, private snackBar: MatSnackBar,
              private events: EventService) {
    this.updateUserDataForm = new FormGroup({
      designation: new FormControl('', []),
      group: new FormControl('', [Validators.required]),
      employeeID: new FormControl('', [Validators.pattern(this.empIDPattern)]),
      ehrmsID: new FormControl({ value: '', disabled: true }, []),
      dob: new FormControl('', []),
      primaryEmail: new FormControl('', [Validators.required, Validators.email, Validators.pattern(this.emailRegix)]),
      // countryCode: new FormControl('+91', []),
      mobile: new FormControl('', [Validators.required, Validators.pattern(this.phoneNumberPattern)]),
      tags: new FormControl('', [Validators.pattern(this.namePatern)]),
      roles: new FormControl('', [Validators.required]),
      domicileMedium: new FormControl('', []),
      gender: new FormControl('', []),
      category: new FormControl('', []),
      pincode: new FormControl('', []),
    })

    this.approveUserDataForm = new FormGroup({
      approveDesignation: new FormControl('', []),
      approveGroup: new FormControl('', []),
    })

    const fullProfile = _.get(this.route.snapshot, 'data.configService')
    this.department = fullProfile.unMappedUser.rootOrgId

    if (fullProfile.unMappedUser && fullProfile.unMappedUser.roles) {
      this.isMdoAdmin = fullProfile.unMappedUser.roles.includes('MDO_ADMIN')
      this.isMdoLeader = fullProfile.unMappedUser.roles.includes('MDO_LEADER')
      this.isBoth = fullProfile.unMappedUser.roles.includes('MDO_LEADER') && fullProfile.unMappedUser.roles.includes('MDO_ADMIN')
    }

    if (this.usersData && this.usersData.length > 0) {
      this.usersData = _.orderBy(this.usersData, item => item.firstName.toUpperCase(), ['asc'])

      // formatting profileStatusUpdatedOn value
      this.usersData.forEach((u: any) => {
        if (u.profileDetails.profileStatusUpdatedOn) {
          const val = u.profileDetails.profileStatusUpdatedOn.split(' ')
          u.profileDetails.profileStatusUpdatedOn = val[0]
        }
      })
    }
  }

  enableUpdateButton(appData: any): boolean {
    let enableBtn = true
    if (appData.needApprovalList) {
      appData.needApprovalList.forEach((field: any) => {
        if (field.label === 'Group' && this.approveUserDataForm.controls.approveGroup.invalid) {
          enableBtn = false
        }
        if (field.label === 'Designation' && this.approveUserDataForm.controls.approveDesignation.invalid) {
          enableBtn = false
        }
      })
    }
    return enableBtn
  }

  ngOnInit() {
    if (this.isApprovals && this.usersData) {
      this.approvalData = this.usersData
      if (this.approvalData && this.approvalData.length > 0) {
        this.getUserMappedData(this.approvalData)
        this.approvalSvc.getProfileConfig().then((res: any) => {
          this.profileData = res && res.profileData
        })
        if (this.profileData) {
          this.getFieldsMappedData(this.approvalData)
        }
      }
    } else {
      this.init()
    }
  }

  ngOnChanges() {
    if (this.usersData) {
      this.usersData = _.orderBy(this.usersData, item => {
        if (item.profileDetails && item.profileDetails.personalDetails) {
          return item.profileDetails.personalDetails.firstname.toUpperCase()
        }
        // tslint:disable-next-line
      }, ['asc'])
    }
  }

  // for approvals
  async getUserMappedData(approvalData: any) {
    approvalData.forEach((data: any) => {
      if (data.userWorkflow && data.userWorkflow.userInfo) {
        const id = data.userWorkflow.userInfo.wid
        this.usersSvc.getUserById(id).subscribe((res: any) => {
          if (res) {
            data.user = res

            if (data.user) {
              if (data.needApprovalList && data.needApprovalList.length === 1) {
                data.noneedApprovalList = []
                if (data.needApprovalList[0].feildName === 'group') {
                  const obj = {
                    label: 'Designation',
                    feildName: 'designation',
                    value: data.user.profileDetails.professionalDetails[0].designation || '',
                  }
                  data.noneedApprovalList.push(obj)
                }
                if (data.needApprovalList[0].feildName === 'designation') {
                  const obj = {
                    label: 'Group',
                    feildName: 'group',
                    value: data.user.profileDetails.professionalDetails[0].group || '',
                  }
                  data.noneedApprovalList.push(obj)
                }
              }
            }
          }
        })
      }
    })
  }

  async getFieldsMappedData(approvalData: any) {
    approvalData.forEach((appdata: any) => {
      if (appdata.userWorkflow.wfInfo && appdata.userWorkflow.wfInfo.length > 0) {
        appdata.needApprovalList = []
        appdata.userWorkflow.wfInfo.forEach((wf: any) => {
          if (typeof wf.updateFieldValues === 'string') {
            const fields = JSON.parse(wf.updateFieldValues)
            if (fields.length > 0) {
              fields.forEach((field: any) => {
                const labelKey = Object.keys(field.toValue)[0]
                const feildNameObj = labelKey === 'designation' ? 'Designation' : 'Group'
                if (labelKey === 'designation' || labelKey === 'group') {
                  appdata.needApprovalList.push(
                    Object.assign({
                      wf,
                      feildName: labelKey,
                      label: feildNameObj,
                      value: field.toValue[labelKey],
                      fieldKey: field.fieldKey,
                      wfId: wf.wfId,
                    })
                  )
                }
              })
            }
          }
        })
      }
    })
  }

  async init() {
    await this.loadDesignations()
    await this.loadGroups()
    await this.loadLangauages()
    // await this.loadCountryCodes()
    await this.loadRoles()
  }

  async loadDesignations() {
    await this.usersSvc.getDesignations({}).subscribe(
      (data: any) => {
        this.designationsMeta = data.responseData
      },
      (_err: any) => {
      })
  }

  async loadGroups() {
    await this.usersSvc.getGroups().subscribe(
      (data: any) => {
        const res = data.result.response
        this.groupsList = res
      },
      (_err: any) => {
      })
  }

  async loadLangauages() {
    await this.usersSvc.getMasterLanguages().subscribe(
      (data: any) => {
        this.masterLanguagesEntries = data.languages
        this.onChangesLanuage()
      },
      (_err: any) => {
      })
  }

  // async loadCountryCodes() {
  //   this.usersSvc.getMasterNationlity().subscribe((data: any) => {
  //     data.nationality.map((item: any) => {
  //       this.countryCodes.push(item.countryCode)
  //     })

  //     this.updateUserDataForm.patchValue({
  //       countryCode: '+91',
  //     })
  //   },
  //     // tslint:disable-next-line
  //     (_err: any) => {
  //     })
  // }

  async loadRoles() {
    this.roleservice.getAllRoles().subscribe((_data: any) => {
      const parseRoledata = JSON.parse(_data.result.response.value)
      this.orgTypeList = parseRoledata.orgTypeList
    })
  }

  closeOtherPanels(openPanel: MatExpansionPanel) {
    this.panels.forEach(panel => {
      if (panel !== openPanel) {
        panel.close()
      }
    })
  }

  otherDropDownChange(value: any, field: string) {
    if (field === 'designation' && value !== 'Other') {
      this.updateUserDataForm.controls['designation'].setValue(value)
    }
  }

  onChangesLanuage(): void {
    // tslint:disable-next-line: no-non-null-assertion
    this.masterLanguages = this.updateUserDataForm.get('domicileMedium')!.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        startWith(''),
        map((value: any) => typeof (value) === 'string' ? value : (value && value.name ? value.name : '')),
        map((name: any) => name ? this.filterLanguage(name) : this.masterLanguagesEntries.slice()),
      )
  }

  private filterLanguage(name: string) {
    if (name) {
      const filterValue = name.toLowerCase()
      return this.masterLanguagesEntries.filter((option: any) => option.name.toLowerCase().includes(filterValue))
    }
    return this.masterLanguagesEntries
  }

  numericOnly(event: any): boolean {
    const pattren = /^([0-9])$/
    const result = pattren.test(event.key)
    return result
  }

  onEditUser(user: any, pnael: any) {
    let userval = user
    this.usersSvc.getUserById(user.userId).subscribe((res: any) => {
      if (res) {
        userval = res
        this.usersData.forEach((u: any) => {
          if (u.userId === user.userId) {
            u.enableEdit = true
            userval.enableEdit = true
          } else {
            u.enableEdit = false
          }
        })

        pnael.open()
        this.setUserDetails(userval)
      }
    })
  }

  getUerData(user: any, data: any, panel: any) {
    if (panel.expanded) {
      user.enableEdit = false
      let profileDataAll = user
      this.userStatus = profileDataAll.isDeleted ? 'Inactive' : 'Active'

      const profileData = profileDataAll.profileDetails
      this.updateTags(profileData)

      if (this.isApprovals) {
        this.approveUserDataForm.reset()
        user.needApprovalList = []
        this.actionList = []
        this.comment = ''
        this.getApprovalList(data)
      } else {
        this.usersSvc.getUserById(user.userId).subscribe((res: any) => {
          if (res) {
            profileDataAll = res
            profileDataAll.enableEdit = false
            // user = profileDataAll
            this.userRoles.clear()
            this.mapRoles(profileDataAll)
          }
        })
      }
    }
  }

  mapRoles(user: any) {
    if (this.orgTypeList && this.orgTypeList.length > 0) {
      // New code for roles
      for (let i = 0; i < this.orgTypeList.length; i += 1) {
        if (this.orgTypeList[i].name === 'MDO') {
          _.each(this.orgTypeList[i].roles, rolesObject => {
            if (rolesObject !== 'MDO_LEADER') {
              this.uniqueRoles.push({
                roleName: rolesObject, description: rolesObject,
              })
            }
          })
        }
      }
      this.uniqueRoles.forEach((role: any) => {
        if (!this.rolesList.some((item: any) => item.roleName === role.roleName)) {
          this.rolesList.push(role)
        }
      })
      const usrRoles = user.organisations[0] && user.organisations[0].roles
        ? user.organisations[0].roles : []
      if (usrRoles.length > 0) {
        this.updateUserDataForm.controls['roles'].setValue(usrRoles)
        usrRoles.forEach((role: any) => {
          this.orguserRoles.push(role)
          this.userRoles.add(role)
          // this.modifyUserRoles(role)
        })
      }
    } else {
      this.loadRoles()
      this.mapRoles(user)
    }
  }

  setUserDetails(user: any) {
    if (user && user.profileDetails) {
      if (user.profileDetails.additionalProperties) {
        if (user.profileDetails.additionalProperties.externalSystemId) {
          this.updateUserDataForm.controls['ehrmsID'].setValue(user.profileDetails.additionalProperties.externalSystemId)
        }
      }
      if (user.profileDetails.professionalDetails) {
        if (user.profileDetails.professionalDetails[0].designation) {
          this.updateUserDataForm.controls['designation'].setValue(user.profileDetails.professionalDetails[0].designation)
        }
        if (user.profileDetails.professionalDetails[0].group) {
          this.updateUserDataForm.controls['group'].setValue(user.profileDetails.professionalDetails[0].group)
        }
      }
      if (user.profileDetails.personalDetails) {
        if (user.profileDetails.personalDetails.primaryEmail) {
          this.updateUserDataForm.controls['primaryEmail'].setValue(user.profileDetails.personalDetails.primaryEmail)
        }
        if (user.profileDetails.personalDetails.mobile) {
          this.updateUserDataForm.controls['mobile'].setValue(user.profileDetails.personalDetails.mobile)
        }
        if (user.profileDetails.personalDetails.gender) {
          if (user.profileDetails.personalDetails.gender === 'FEMALE') {
            this.updateUserDataForm.controls['gender'].setValue('Female')
          } else if (user.profileDetails.personalDetails.gender === 'MALE') {
            this.updateUserDataForm.controls['gender'].setValue('Male')
          } else if (user.profileDetails.personalDetails.gender === 'OTHERS') {
            this.updateUserDataForm.controls['gender'].setValue('Others')
          } else {
            this.updateUserDataForm.controls['gender'].setValue(user.profileDetails.personalDetails.gender)
          }
        }
        if (user.profileDetails.personalDetails.dob) {
          // this.updateUserDataForm.controls['dob'].setValue(user.profileDetails.personalDetails.dob)
          this.updateUserDataForm.patchValue({
            dob: this.getDateFromText(user.profileDetails.personalDetails.dob),
          })
        }
        if (user.profileDetails.personalDetails.domicileMedium) {
          this.updateUserDataForm.controls['domicileMedium'].setValue(user.profileDetails.personalDetails.domicileMedium)
        }
        if (user.profileDetails.personalDetails.category) {
          this.updateUserDataForm.controls['category'].setValue(user.profileDetails.personalDetails.category)
        }
        // if (user.profileDetails.personalDetails.pinCode) {
        //   this.updateUserDataForm.controls['pincode'].setValue(user.profileDetails.personalDetails.pinCode)
        // }
      }

      if (user.profileDetails.employmentDetails) {
        if (user.profileDetails.employmentDetails.pinCode) {
          this.updateUserDataForm.controls['pincode'].setValue(user.profileDetails.employmentDetails.pinCode)
        }
        if (user.profileDetails.employmentDetails.employeeCode) {
          this.updateUserDataForm.controls['employeeID'].setValue(user.profileDetails.employmentDetails.employeeCode)
        }
      }
      this.mapRoles(user)
    }
  }

  private getDateFromText(dateString: string): any {
    if (dateString) {
      const sv: string[] = dateString.split('T')
      if (sv && sv.length > 1) {
        return sv[0]
      }
      const splitValues: string[] = dateString.split('-')
      const [dd, mm, yyyy] = splitValues
      const dateToBeConverted = `${yyyy}-${mm}-${dd}`
      return new Date(dateToBeConverted)
    }
    return ''
  }

  getUseravatarName(user: any) {
    let name = ''
    if (user && user.profileDetails && user.profileDetails.personalDetails) {
      if (user.profileDetails.personalDetails.firstname) {
        name = `${user.profileDetails.personalDetails.firstname}`
      }
    } else {
      name = `${user.firstName}`
    }
    return name
  }

  getApprovalList(approvalData: any) {
    this.userwfData = approvalData
  }

  cancelSubmit(user: any) {
    this.updateUserDataForm.reset()
    user.enableEdit = !user.enableEdit
  }

  modifyUserRoles(role: string) {
    if (this.userRoles.has(role)) {
      this.userRoles.delete(role)
    } else {
      this.userRoles.add(role)
    }
  }

  updateTags(profileData: any) {
    this.selectedtags = _.get(profileData, 'additionalProperties.tag') || []
  }

  addActivity(event: MatChipInputEvent) {
    const input = event.input
    const value = event.value as string
    // if ((value && value.trim()) && this.updateUserDataForm.valid) {
    if ((value && value.trim())) {
      this.isTagsEdited = true
      this.selectedtags.push(value)
    }
    if (input) {
      input.value = ''
    }
    if (this.updateUserDataForm.get('tags')) {
      // tslint:disable-next-line: no-non-null-assertion
      this.updateUserDataForm.get('tags')!.setValue(null)
    }
    this.updateUserDataForm.controls['tags'].reset()
  }

  removeActivity(interest: any) {
    const index = this.selectedtags.indexOf(interest)
    if (index >= 0) {
      this.selectedtags.splice(index, 1)
      this.isTagsEdited = true
    }
  }

  checkForChange(activityList: any) {
    const newobj: any = []
    activityList.forEach((val: any) => {
      const reqObj = {
        name: val,
      }
      newobj.push(reqObj)
    })
  }

  onChangePage(pe: PageEvent) {
    this.startIndex = (pe.pageIndex) * pe.pageSize
    this.lastIndex = pe.pageSize
    this.paginationData.emit({ pageIndex: this.startIndex, pageSize: pe.pageSize })
  }

  onSearch(event: any) {
    this.searchByEnterKey.emit(event)
  }

  onSubmit(form: any, user: any, panel: any) {
    if (form.valid) {
      this.reqbody = {
        request: {
          userId: user.userId,
          profileDetails: {
            personalDetails: {
              dob: this.updateUserDataForm.controls['dob'].value,
              domicileMedium: this.updateUserDataForm.controls['domicileMedium'].value,
              gender: this.updateUserDataForm.controls['gender'].value,
              category: this.updateUserDataForm.controls['category'].value,
              mobile: this.updateUserDataForm.controls['mobile'].value,
              primaryEmail: this.updateUserDataForm.controls['primaryEmail'].value,
            },
            professionalDetails: [
              {
                designation: this.updateUserDataForm.controls['designation'].value,
                group: this.updateUserDataForm.controls['group'].value,
              },
            ],
            additionalProperties: {
              tag: this.selectedtags,
            },
            employmentDetails: {
              pinCode: this.updateUserDataForm.controls['pincode'].value,
            },
          },
        },
      }
      this.usersSvc.updateUserDetails(this.reqbody).subscribe(dres => {
        if (dres) {
          if (this.isMdoLeader) {
            if (form.value.roles !== this.orguserRoles) {
              const dreq = {
                request: {
                  organisationId: this.department,
                  userId: user.userId,
                  roles: Array.from(this.userRoles),
                },
              }
              this.usersSvc.addUserToDepartment(dreq).subscribe(res => {
                if (res) {
                  this.updateUserDataForm.reset({ roles: '' })
                  // this.openSnackbar('User role updated Successfully')q
                  this.openSnackbar('User updated Successfully')
                  panel.close()
                  this.updateList.emit()
                  this.searchByEnterKey.emit('')
                }
              })
            } else {
              this.openSnackbar('Select new roles')
            }
          } else {
            user['enableEdit'] = false

            panel.close()
            this.updateList.emit()
            this.openSnackbar('User updated Successfully')
          }
        }
      },
        // tslint:disable-next-line: align
        (err: { error: any }) => {
          this.openSnackbar(err.error.params.errmsg)
        })
    }
  }

  private openSnackbar(primaryMsg: string, duration: number = 5000) {
    this.snackBar.open(primaryMsg, 'X', {
      duration,
    })
  }

  // for approval & rejection
  onClickHandleWorkflow(field: any, action: string) {
    field.action = action
    const req = {
      action,
      comment: '',
      state: 'SEND_FOR_APPROVAL',
      userId: field.wf.userId,
      applicationId: field.wf.applicationId,
      actorUserId: this.userwfData.userInfo.wid,
      wfId: field.wf.wfId,
      serviceName: 'profile',
      updateFieldValues: JSON.parse(field.wf.updateFieldValues),
    }
    if (action === 'APPROVE') {
      // const index = this.actionList.indexOf(req.wfId)
      const index = this.actionList.findIndex((x: any) => x.wfId === req.wfId)
      if (index > -1) {
        this.actionList[index] = req
      } else {
        this.actionList.push(req)
      }
      // this.onApproveOrRejectClick(req)
    } else {
      this.comment = ''
      const dialogRef = this.dialog.open(this.rejectDialog, {
        width: '770px',
      })
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // this.onApproveOrRejectClick(req)
          req.comment = this.comment
          field.comment = this.comment
          // const index = this.actionList.indexOf(req.wfId)
          const index = this.actionList.findIndex((x: any) => x.wfId === req.wfId)
          if (index > -1) {
            this.actionList[index] = req
          } else {
            this.actionList.push(req)
          }
        } else {
          dialogRef.close()
        }
      })
    }

    this.events.raiseInteractTelemetry(
      {
        type: TelemetryEvents.EnumInteractTypes.CLICK,
        subType: TelemetryEvents.EnumInteractSubTypes.BTN_CONTENT,
      },
      {
        id: field.wf.applicationId,
        type: TelemetryEvents.EnumIdtype.APPLICATION,
      }
    )
  }

  // single aprrove or reject
  onApproveOrRejectClick(req: any) {
    this.approvalSvc.handleWorkflow(req).subscribe((res: any) => {
      if (res.result.data) {
        // this.openSnackbar('Request approved successfully')
      }
    })
  }

  onApprovalSubmit(panel: any) {
    if (this.actionList.length > 0) {
      const datalength = this.actionList.length
      this.actionList.forEach((req: any, index: any) => {
        if (req.action === 'APPROVE') {
          req.comment = ''
        }
        this.onApproveOrRejectClick(req)
        if (index === datalength - 1) {
          panel.close()
          this.comment = ''
          setTimeout(() => {
            this.openSnackbar('Request approved successfully')
            this.updateList.emit()
            // tslint:disable-next-line
          }, 100)
        }
        // tslint:disable-next-line
        // this.approvalData = this.approvalData.filter((wf: any) => { wf.userWorkflow.userInfo.wid !== req.userId })
        if (this.approvalData.length === 0) {
          this.disableButton.emit()
        }
      })
    }
  }

  updateRejection(field: any) {
    this.comment = field.comment
    const dialogRef = this.dialog.open(this.updaterejectDialog, {
      width: '770px',
    })
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.actionList.forEach((req: any) => {
          if (req.wfId === field.wfId) {
            req.comment = this.comment
            field.comment = this.comment
            this.showeditText = false
          }
        })
      } else {
        dialogRef.close()
      }
    })
  }

  showedit() {
    this.showeditText = true
  }

  markStatus(status: any, user: any) {
    const reqbody = {
      request: {
        userId: user.userId,
        profileDetails: {
          profileStatus: status,
        },
      },
    }

    this.usersSvc.updateUserDetails(reqbody).subscribe(dres => {
      if (dres) {
        this.openSnackbar('User status updated Successfully')
        this.updateList.emit()
      }
    },
      // tslint:disable-next-line: align
      (err: { error: any }) => {
        this.openSnackbar(err.error.params.errmsg)
      })
  }

  confirmReassign(template: any, user: any) {
    const dialog = this.dialog.open(template, {
      width: '500px',
    })
    dialog.afterClosed().subscribe((v: any) => {
      if (v) {
        this.markStatus('NOT-VERIFIED', user)
      }
    })
  }

  confirmUpdate(template: any, updateUserDataForm: any, user: any, panel: any) {
    const dialog = this.dialog.open(template, {
      width: '500px',
    })
    dialog.afterClosed().subscribe((v: any) => {
      if (v) {
        this.onSubmit(updateUserDataForm, user, panel)
      } else {
        this.cancelSubmit(user)
      }
    })
  }

  confirmApproval(template: any, panel: any) {
    const dialog = this.dialog.open(template, {
      width: '500px',
    })
    dialog.afterClosed().subscribe((v: any) => {
      if (v) {
        this.onApprovalSubmit(panel)
      } else {
        panel.close()
      }
    })
  }

  onApprovalCancel(panel: any, appData: any) {
    panel.close()
    appData.needApprovalList.forEach((f: any) => {
      f.action = ''
    })
  }
}
