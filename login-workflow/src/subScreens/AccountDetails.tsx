/**
 * @packageDocumentation
 * @module Sub-Screens
 */

import React from 'react';

// Components
import { View, StyleSheet, SafeAreaView, TextInput as ReactTextInput } from 'react-native';
import { TextInput } from '../components/TextInput';
import { Instruction } from '../components/Instruction';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from 'react-native-paper';

// Hooks
import { useLanguageLocale } from '@pxblue/react-auth-shared';

/**
 * @ignore
 */
const makeContainerStyles = (theme: ReactNativePaper.Theme): Record<string, any> =>
    StyleSheet.create({
        safeContainer: {
            height: '100%',
            backgroundColor: theme.colors.surface,
        },
        mainContainer: {
            flex: 1,
        },
        containerMargins: {
            marginHorizontal: 20,
        },
    });

/**
 * @ignore
 */
const makeStyles = (): Record<string, any> =>
    StyleSheet.create({
        inputMargin: {
            marginTop: 40,
        },
    });

/**
 * Type to represent the input of the account details component.
 *
 * @param firstName  The first name string.
 * @param lastName  The last name string.
 */
export type AccountDetailInformation = {
    firstName: string;
    lastName: string;
};

/**
 * Defaults for the account details component inputs.
 */
export const emptyAccountDetailInformation = {
    firstName: '',
    lastName: '',
};

/**
 * Handle the change of any of the account details inputs.
 *
 * @param onDetailsChanged   Handle the change of any of the account details inputs.
 * @param theme (Optional) react-native-paper theme partial for custom styling.
 */
export type AccountDetailsProps = {
    onDetailsChanged(details: AccountDetailInformation | null): void;
    theme?: ReactNativePaper.Theme;
};

/**
 * Renders the content of the Account Details screen entry
 * (inputs for first name, last name, and phone number).
 *
 * @category Component
 */
export const AccountDetails: React.FC<AccountDetailsProps> = (props) => {
    const theme = useTheme(props.theme);
    const [firstNameInput, setFirstNameInput] = React.useState('');
    const [lastNameInput, setLastNameInput] = React.useState('');
    const { t } = useLanguageLocale();

    React.useEffect(() => {
        if (firstNameInput.length > 0 && lastNameInput.length > 0) {
            props.onDetailsChanged({ firstName: firstNameInput, lastName: lastNameInput });
        } else {
            props.onDetailsChanged(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firstNameInput, lastNameInput]); // ignore props

    const styles = makeStyles();
    const containerStyles = makeContainerStyles(theme);

    const lastNameRef = React.useRef<ReactTextInput>(null);
    const goToLastName = (): void => lastNameRef?.current?.focus();

    return (
        <SafeAreaView style={containerStyles.safeContainer}>
            <KeyboardAwareScrollView>
                <Instruction
                    text={t('REGISTRATION.INSTRUCTIONS.ACCOUNT_DETAILS')}
                    style={containerStyles.containerMargins}
                />

                <View style={[containerStyles.containerMargins, containerStyles.mainContainer]}>
                    <TextInput
                        label={t('FORMS.FIRST_NAME')}
                        value={firstNameInput}
                        style={styles.inputMargin}
                        autoCapitalize={'sentences'}
                        returnKeyType={'next'}
                        onChangeText={(text: string): void => setFirstNameInput(text)}
                        onSubmitEditing={(): void => {
                            goToLastName();
                        }}
                        blurOnSubmit={false}
                    />

                    <TextInput
                        ref={lastNameRef}
                        label={t('FORMS.LAST_NAME')}
                        value={lastNameInput}
                        style={styles.inputMargin}
                        autoCapitalize={'sentences'}
                        returnKeyType={'next'}
                        onChangeText={(text: string): void => setLastNameInput(text)}
                    />
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
};
