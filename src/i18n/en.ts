export const en = {
  // Auth
  appName: 'Family Tree',
  signIn: 'Sign in to your account',
  createAccount: 'Create your account',
  email: 'Email',
  password: 'Password',
  signInBtn: 'Sign In',
  registerBtn: 'Create Account',
  noAccount: "Don't have an account?",
  haveAccount: 'Already have an account?',
  register: 'Register',
  loginFailed: 'Login failed',
  registerFailed: 'Registration failed',

  // Navbar
  back: '← Back',
  logout: 'Logout',
  print: '🖨️ Print',
  share: '🔗 Share',

  // Tree list
  myTrees: 'My Family Trees',
  treeDesc: 'Create and manage your family trees',
  create: '+ Create',
  created: 'Created',
  open: 'Open',
  delete: 'Delete',
  noTrees: 'No family trees yet. Create one above to get started!',
  treePlaceholder: 'My Family Tree',

  // Empty tree
  emptyTitle: 'Your tree is empty',
  emptyDesc: 'Start building your family tree by adding the first person!',
  addFirstPerson: '+ Add First Person',

  // Person form modal
  addYourself: 'Add Yourself',
  addPerson: 'Add Person',
  add: 'Add',
  personDetails: "Enter the person's details below",
  name: 'Name',
  namePlaceholder: 'Enter full name',
  genderTitle: 'Gender',
  male: '♂ Male',
  female: '♀ Female',
  skip: 'Skip',
  cancel: 'Cancel',
  save: 'Save',
  editName: 'Edit Name',

  // Context menu
  addSpouse: '➕ Add Spouse',
  addChild: '👶 Add Child',
  addParent: '👴 Add Parent',
  addSibling: '👫 Add Sibling',
  edit: '✏️ Edit Name',
  deletePerson: '🗑️ Delete',
  deleteConfirm: 'Delete this person and all their connections?',

  // Share modal
  shareTitle: 'Share Your Family Tree',
  shareDesc: 'Your family history is a gift — share',
  shareDesc2: 'with the people who matter most.',
  shareDesc3: 'Send this link to your relatives',
  shareDesc4: 'so they can explore the tree, see the connections, and feel the love of your family story. 💚',
  copy: '📋 Copy',
  copied: '✅ Copied!',
  close: 'Close',

  // Shared view
  sharedView: 'Shared View',
  buildYourOwn: 'Build your own tree →',
  treeNotFound: 'Tree not found or link is invalid',
  goHome: 'Go home',

  // Loading
  loading: 'Loading...',

  // Errors
  failed: 'Failed',
  noParentFound: 'No parent found. Add a parent first.',
  canvasNotReady: 'Canvas not ready yet',
  printFailed: 'Could not generate image. Try taking a screenshot manually.',
  shareCopied: 'Share link copied!',

  // Language
  language: 'English',
  langSwitch: 'العربية',
};

export type Translations = typeof en;
